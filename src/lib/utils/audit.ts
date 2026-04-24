import { createAdminClient } from "@/lib/supabase/server";
import { redact } from "./redact";
import { headers } from "next/headers";

interface AuditOptions {
  actorId?: string;
  action: string;
  entityType: string;
  entityId?: string;
  payload?: Record<string, unknown>;
}

export async function writeAuditLog(opts: AuditOptions) {
  try {
    const supabase = await createAdminClient();
    const headersList = await headers();

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await (supabase.from("audit_log") as any).insert({
      actor_id: opts.actorId ?? null,
      action: opts.action,
      entity_type: opts.entityType,
      entity_id: opts.entityId ?? null,
      payload: opts.payload ? redact(opts.payload) : null,
      ip_address: headersList.get("x-forwarded-for") ?? headersList.get("x-real-ip") ?? null,
      user_agent: headersList.get("user-agent") ?? null,
    });
  } catch (err) {
    // Audit failures should never break the main flow
    console.error("[audit]", err);
  }
}
