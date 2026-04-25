import { createAdminClient } from "@/lib/supabase/server";
import { AuditLogClient } from "./audit-log-client";

export const metadata = { title: "Audit Log — Turnos UTN FRT" };

export default async function AuditLogPage() {
  const adminClient = await createAdminClient();

  const { data: logs } = await adminClient
    .from("audit_log")
    .select("*, actor:profiles(full_name)")
    .order("created_at", { ascending: false })
    .limit(200);

  return <AuditLogClient initialLogs={logs ?? []} />;
}
