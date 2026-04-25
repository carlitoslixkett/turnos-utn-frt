import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { PerfilClient } from "./perfil-client";

export const metadata = { title: "Mi Perfil — Turnos UTN FRT" };

export default async function PerfilPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const { data: profile } = await supabase.from("profiles").select("*").eq("id", user.id).single();

  if (!profile) redirect("/login");

  return <PerfilClient profile={profile} email={user.email ?? ""} />;
}
