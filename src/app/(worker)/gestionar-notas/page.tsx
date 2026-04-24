import { createClient } from "@/lib/supabase/server";
import { NotesClient } from "./notes-client";

export default async function GestionarNotasPage() {
  const supabase = await createClient();
  const { data: notes } = await supabase.from("notes").select("*").order("name");

  return <NotesClient initialNotes={notes ?? []} />;
}
