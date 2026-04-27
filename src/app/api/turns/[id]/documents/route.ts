import { NextRequest, NextResponse } from "next/server";
import { createAdminClient, createClient } from "@/lib/supabase/server";
import { writeAuditLog } from "@/lib/utils/audit";
import crypto from "crypto";

const BUCKET = "turn-documents";
const MAX_BYTES = 10 * 1024 * 1024; // 10 MB
const ALLOWED_MIME = new Set(["image/jpeg", "image/png", "image/webp", "application/pdf"]);
const MAX_DOCS_PER_TURN = 10;

// GET /api/turns/[id]/documents — list with signed URLs
export async function GET(_: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  // Authorize: student-owner or worker
  const { data: profile } = await supabase
    .from("profiles")
    .select("user_type")
    .eq("id", user.id)
    .single();
  const isWorker = profile?.user_type === "worker";

  const admin = await createAdminClient();
  const { data: turn } = await admin.from("turns").select("id, student_id").eq("id", id).single();
  if (!turn) return NextResponse.json({ error: "Turno no encontrado" }, { status: 404 });
  if (!isWorker && turn.student_id !== user.id) {
    return NextResponse.json({ error: "No autorizado" }, { status: 403 });
  }

  const { data: docs } = await admin
    .from("turn_documents")
    .select("*")
    .eq("turn_id", id)
    .order("uploaded_at", { ascending: false });

  // Generate short-lived signed URLs for each doc (5 min)
  const result = await Promise.all(
    (docs ?? []).map(async (d) => {
      const { data: signed } = await admin.storage
        .from(BUCKET)
        .createSignedUrl(d.storage_path, 300);
      return { ...d, signed_url: signed?.signedUrl ?? null };
    })
  );

  return NextResponse.json({ data: result });
}

// POST /api/turns/[id]/documents — multipart/form-data file upload
export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createClient();
  const admin = await createAdminClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  // Only the student-owner can upload (workers attach via their own UI later if needed)
  const { data: turn } = await admin
    .from("turns")
    .select("id, student_id, status")
    .eq("id", id)
    .single();
  if (!turn) return NextResponse.json({ error: "Turno no encontrado" }, { status: 404 });
  if (turn.student_id !== user.id) {
    return NextResponse.json(
      { error: "Solo el dueño del turno puede subir documentos" },
      { status: 403 }
    );
  }
  if (turn.status !== "pending") {
    return NextResponse.json(
      { error: "No se pueden adjuntar documentos a un turno que ya fue procesado" },
      { status: 400 }
    );
  }

  const { count: existingCount } = await admin
    .from("turn_documents")
    .select("id", { count: "exact", head: true })
    .eq("turn_id", id);
  if ((existingCount ?? 0) >= MAX_DOCS_PER_TURN) {
    return NextResponse.json(
      { error: `Llegaste al máximo de ${MAX_DOCS_PER_TURN} documentos por turno` },
      { status: 400 }
    );
  }

  const form = await request.formData();
  const file = form.get("file");
  if (!(file instanceof File)) {
    return NextResponse.json({ error: "Archivo no provisto" }, { status: 400 });
  }
  if (!ALLOWED_MIME.has(file.type)) {
    return NextResponse.json(
      { error: "Tipo de archivo no permitido (JPG, PNG, WEBP o PDF)" },
      { status: 400 }
    );
  }
  if (file.size > MAX_BYTES) {
    return NextResponse.json({ error: "El archivo no puede superar los 10 MB" }, { status: 400 });
  }
  if (file.size <= 0) {
    return NextResponse.json({ error: "Archivo vacío" }, { status: 400 });
  }

  const ext =
    file.type === "application/pdf"
      ? "pdf"
      : file.type === "image/jpeg"
        ? "jpg"
        : file.type === "image/png"
          ? "png"
          : "webp";
  const objectKey = `${id}/${crypto.randomUUID()}.${ext}`;
  const buffer = Buffer.from(await file.arrayBuffer());

  const { error: upErr } = await admin.storage.from(BUCKET).upload(objectKey, buffer, {
    contentType: file.type,
    upsert: false,
  });
  if (upErr) {
    return NextResponse.json({ error: upErr.message }, { status: 500 });
  }

  // Sanitize file name (avoid path-traversal in display)
  const safeName = file.name.replace(/[\\/]/g, "_").slice(0, 200);

  const { data: doc, error: insErr } = await admin
    .from("turn_documents")
    .insert({
      turn_id: id,
      storage_path: objectKey,
      file_name: safeName,
      mime_type: file.type,
      size_bytes: file.size,
      uploaded_by: user.id,
    })
    .select("*")
    .single();
  if (insErr) {
    await admin.storage.from(BUCKET).remove([objectKey]);
    return NextResponse.json({ error: insErr.message }, { status: 500 });
  }

  await writeAuditLog({
    actorId: user.id,
    action: "turn_document.upload",
    entityType: "turn_documents",
    entityId: doc.id,
    payload: { turn_id: id, file_name: safeName, mime_type: file.type, size_bytes: file.size },
  });

  return NextResponse.json({ data: doc }, { status: 201 });
}
