import { NextRequest, NextResponse } from "next/server";
import { createAdminClient, createClient } from "@/lib/supabase/server";
import { writeAuditLog } from "@/lib/utils/audit";

const BUCKET = "turn-documents";

// DELETE /api/turns/[id]/documents/[doc_id]
export async function DELETE(
  _: NextRequest,
  { params }: { params: Promise<{ id: string; doc_id: string }> }
) {
  const { id, doc_id } = await params;
  const supabase = await createClient();
  const admin = await createAdminClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  const { data: doc } = await admin
    .from("turn_documents")
    .select("*, turn:turns(student_id, status)")
    .eq("id", doc_id)
    .eq("turn_id", id)
    .single();
  if (!doc) return NextResponse.json({ error: "Documento no encontrado" }, { status: 404 });

  const turn = doc.turn as { student_id: string; status: string } | null;
  if (!turn || turn.student_id !== user.id) {
    return NextResponse.json(
      { error: "Solo el dueño del turno puede eliminar sus documentos" },
      { status: 403 }
    );
  }
  if (turn.status !== "pending") {
    return NextResponse.json(
      { error: "No se pueden eliminar documentos de un turno ya procesado" },
      { status: 400 }
    );
  }

  await admin.storage.from(BUCKET).remove([doc.storage_path]);
  await admin.from("turn_documents").delete().eq("id", doc_id);

  await writeAuditLog({
    actorId: user.id,
    action: "turn_document.delete",
    entityType: "turn_documents",
    entityId: doc_id,
    payload: { turn_id: id, file_name: doc.file_name },
  });

  return NextResponse.json({ ok: true });
}
