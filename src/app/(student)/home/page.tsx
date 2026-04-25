import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { CalendarPlus, CalendarDays } from "lucide-react";
import { format } from "date-fns";
import { es } from "date-fns/locale";

const statusConfig = {
  pending: { label: "Pendiente", color: "bg-yellow-100 text-yellow-800" },
  attended: { label: "Atendido", color: "bg-green-100 text-green-800" },
  lost: { label: "Ausente", color: "bg-red-100 text-red-800" },
  cancelled: { label: "Cancelado", color: "bg-gray-100 text-gray-600" },
};

export const metadata = { title: "Inicio — Turnos UTN FRT" };

export default async function HomePage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const [{ data: profile }, { data: turns }, { data: newsList }] = await Promise.all([
    supabase.from("profiles").select("full_name").eq("id", user.id).single(),
    supabase
      .from("turns")
      .select("*, note:notes(name), interval:intervals(name)")
      .eq("student_id", user.id)
      .eq("status", "pending")
      .order("date", { ascending: true })
      .limit(3),
    supabase
      .from("news")
      .select("id, title, description, created_at")
      .eq("status", "posted")
      .order("created_at", { ascending: false })
      .limit(4),
  ]);

  const firstName = profile?.full_name?.split(" ")[0] ?? "Estudiante";

  return (
    <div className="space-y-8">
      {/* Welcome + CTA */}
      <div className="flex flex-col items-start justify-between gap-4 sm:flex-row sm:items-center">
        <div>
          <h1 className="text-3xl font-bold">Hola, {firstName}</h1>
          <p className="text-muted-foreground mt-1">¿Qué necesitás hacer hoy?</p>
        </div>
        <Button
          render={<Link href="/sacar-turno" />}
          nativeButton={false}
          size="lg"
          className="rounded-2xl bg-[#E94A1F] px-6 font-bold text-white hover:bg-[#c73d18]"
        >
          <CalendarPlus className="mr-2 h-5 w-5" />
          Sacar Turno
        </Button>
      </div>

      {/* Mis turnos próximos */}
      <section>
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-xl font-semibold">Mis próximos turnos</h2>
          <Link href="/mis-turnos" className="text-sm font-medium text-[#E94A1F] hover:underline">
            Ver todos
          </Link>
        </div>

        {!turns || turns.length === 0 ? (
          <Card className="rounded-2xl border-dashed">
            <CardContent className="flex flex-col items-center py-10 text-center">
              <CalendarDays className="text-muted-foreground/40 mb-3 h-12 w-12" />
              <p className="text-muted-foreground font-medium">No tenés turnos pendientes</p>
              <p className="text-muted-foreground/70 mt-1 text-sm">
                Podés sacar un turno desde el botón de arriba
              </p>
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {turns.map((turn) => {
              const cfg = statusConfig[turn.status as keyof typeof statusConfig];
              const noteData = turn.note as { name: string } | null;
              return (
                <Card
                  key={turn.id}
                  className="rounded-2xl shadow-sm transition-shadow hover:shadow-md"
                >
                  <CardHeader className="pb-2">
                    <div className="flex items-start justify-between">
                      <CardTitle className="text-base">{noteData?.name ?? "Trámite"}</CardTitle>
                      <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${cfg.color}`}>
                        {cfg.label}
                      </span>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-1">
                    <p className="text-muted-foreground text-sm">
                      {format(new Date(turn.date), "EEEE d 'de' MMMM, HH:mm", { locale: es })}
                    </p>
                    <Button
                      render={<Link href={`/mis-turnos/${turn.id}`} />}
                      nativeButton={false}
                      variant="outline"
                      size="sm"
                      className="mt-2 w-full rounded-xl"
                    >
                      Gestionar turno
                    </Button>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}
      </section>

      {/* Noticias */}
      <section>
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-xl font-semibold">Noticias</h2>
          <Link href="/noticias" className="text-sm font-medium text-[#E94A1F] hover:underline">
            Ver todas
          </Link>
        </div>

        {!newsList || newsList.length === 0 ? (
          <p className="text-muted-foreground text-sm">No hay noticias publicadas.</p>
        ) : (
          <div className="grid gap-3 sm:grid-cols-2">
            {newsList.map((n) => (
              <Card key={n.id} className="rounded-2xl shadow-sm">
                <CardHeader className="pb-1">
                  <CardTitle className="line-clamp-1 text-base">{n.title}</CardTitle>
                  <p className="text-muted-foreground text-xs">
                    {format(new Date(n.created_at), "d MMM yyyy", { locale: es })}
                  </p>
                </CardHeader>
                <CardContent>
                  <p className="text-muted-foreground line-clamp-3 text-sm">{n.description}</p>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
