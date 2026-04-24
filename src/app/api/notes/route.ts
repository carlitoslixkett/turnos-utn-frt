import { NextRequest, NextResponse } from "next/server";
import { createAdminClient, createClient } from "@/lib/supabase/server";
import { createNoteSchema } from "@/lib/validations/notes";
import { writeAuditLog } from "@/lib/utils/audit";

export async function GET(request: NextRequest) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  const { searchParams } = new URL(request.url);
  const is_active = searchParams.get("is_active");

  let query = supabase.from("notes").select("*").order("name");
  if (is_active !== null) query = query.eq("is_active", is_active === "true");

  const { data, error } = await query;
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ data });
}

export async function POST(request: NextRequest) {
  const supabase = await createClient();
  const adminClient = await createAdminClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  const { data: profile } = await supabase
    .from("profiles")
    .select("user_type")
    .eq("id", user.id)
    .single();
  if (!profile || profile.user_type !== "worker")
    return NextResponse.json({ error: "Solo los empleados pueden crear notas" }, { status: 403 });

  const body = await request.json();
  const parsed = createNoteSchema.safeParse(body);
  if (!parsed.success)
    return NextResponse.json({ error: parsed.error.issues[0].message }, { status: 400 });

  const { data: note, error } = await adminClient
    .from("notes")
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    .insert({ ...parsed.data, created_by: user.id } as any)
    .select("*")
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  await writeAuditLog({
    actorId: user.id,
    action: "note.create",
    entityType: "notes",
    entityId: note.id,
    payload: { name: note.name },
  });

  return NextResponse.json({ data: note }, { status: 201 });
}
