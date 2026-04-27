import { NextRequest, NextResponse } from "next/server";
import { createAdminClient, createClient } from "@/lib/supabase/server";
import { officeSettingsSchema } from "@/lib/validations/intervals";
import { writeAuditLog } from "@/lib/utils/audit";

export async function GET() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  const admin = await createAdminClient();
  const { data, error } = await admin
    .from("office_settings")
    .select("attention_windows, timezone, updated_at")
    .eq("id", 1)
    .maybeSingle();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({
    data: data ?? { attention_windows: [], timezone: "America/Argentina/Buenos_Aires" },
  });
}

export async function PUT(request: NextRequest) {
  const supabase = await createClient();
  const admin = await createAdminClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  const { data: profile } = await supabase
    .from("profiles")
    .select("user_type")
    .eq("id", user.id)
    .single();
  if (!profile || profile.user_type !== "worker") {
    return NextResponse.json({ error: "Solo empleados" }, { status: 403 });
  }

  const body = await request.json();
  const parsed = officeSettingsSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0].message }, { status: 400 });
  }

  const { error } = await admin
    .from("office_settings")
    .update({
      attention_windows: parsed.data.attention_windows,
      updated_by: user.id,
      updated_at: new Date().toISOString(),
    })
    .eq("id", 1);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  // Recompute turn_quantity for all active intervals so the metrics view reflects new windows
  const { data: intervals } = await admin
    .from("intervals")
    .select("id, date_start, date_end, turn_duration_minutes")
    .eq("is_active", true);
  if (intervals && intervals.length > 0) {
    const { countSlots } = await import("@/lib/utils/interval-slots");
    for (const i of intervals) {
      const qty = countSlots(
        new Date(i.date_start as string),
        new Date(i.date_end as string),
        i.turn_duration_minutes as number,
        parsed.data.attention_windows
      );
      await admin.from("intervals").update({ turn_quantity: qty }).eq("id", i.id);
    }
  }

  await writeAuditLog({
    actorId: user.id,
    action: "office_settings.update",
    entityType: "office_settings",
    entityId: "1",
    payload: { attention_windows: parsed.data.attention_windows },
  });

  return NextResponse.json({ ok: true });
}
