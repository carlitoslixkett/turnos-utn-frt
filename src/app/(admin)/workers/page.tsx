import { createAdminClient } from "@/lib/supabase/server";
import { WorkersClient } from "./workers-client";

export default async function WorkersPage() {
  const adminClient = await createAdminClient();

  const { data: workers } = await adminClient
    .from("profiles")
    .select("*, worker_roles(role)")
    .eq("user_type", "worker")
    .order("full_name");

  return <WorkersClient initialWorkers={workers ?? []} />;
}
