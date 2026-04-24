import { createClient } from "@/lib/supabase/server";
import { NewsAdminClient } from "./news-admin-client";

export default async function NoticiasAdminPage() {
  const supabase = await createClient();
  const { data: news } = await supabase
    .from("news")
    .select("*")
    .is("deleted_at", null)
    .order("created_at", { ascending: false });

  return <NewsAdminClient initialNews={news ?? []} />;
}
