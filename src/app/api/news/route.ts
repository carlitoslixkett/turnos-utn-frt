import { NextRequest, NextResponse } from "next/server";
import { createAdminClient, createClient } from "@/lib/supabase/server";
import { createNewsSchema } from "@/lib/validations/news";
import { writeAuditLog } from "@/lib/utils/audit";

export async function GET(request: NextRequest) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  const { searchParams } = new URL(request.url);
  const status = searchParams.get("status");
  const published_only = searchParams.get("published_only");

  let query = supabase
    .from("news")
    .select("*")
    .is("deleted_at", null)
    .order("created_at", { ascending: false });

  if (status) query = query.eq("status", status as "posted" | "pending" | "deleted");
  if (published_only === "true") {
    query = query.eq("status", "posted");
  }

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
    return NextResponse.json(
      { error: "Solo los empleados pueden crear noticias" },
      { status: 403 }
    );

  const body = await request.json();
  const parsed = createNewsSchema.safeParse(body);
  if (!parsed.success)
    return NextResponse.json({ error: parsed.error.issues[0].message }, { status: 400 });

  const { data: news, error } = await adminClient
    .from("news")
    .insert({ ...parsed.data, created_by: user.id })
    .select("*")
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  await writeAuditLog({
    actorId: user.id,
    action: "news.create",
    entityType: "news",
    entityId: news.id,
    payload: { title: news.title, status: news.status },
  });

  return NextResponse.json({ data: news }, { status: 201 });
}
