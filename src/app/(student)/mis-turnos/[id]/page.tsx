import { createClient } from "@/lib/supabase/server";
import { redirect, notFound } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import { ArrowLeft } from "lucide-react";
import { TurnDetailClient } from "./turn-detail-client";

const STATUS_CONFIG = {
  pending: { label: "Pendiente", color: "bg-yellow-100 text-yellow-800" },
  attended: { label: "Atendido", color: "bg-green-100 text-green-800" },
  lost: { label: "Ausente", color: "bg-red-100 text-red-800" },
  cancelled: { label: "Cancelado", color: "bg-gray-100 text-gray-600" },
};

export default async function TurnDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: turn } = await supabase
    .from("turns")
    .select("*, note:notes(name, description), interval:intervals(name)")
    .eq("id", id)
    .eq("student_id", user.id)
    .single();

  if (!turn) notFound();

  const cfg = STATUS_CONFIG[turn.status as keyof typeof STATUS_CONFIG];
  const noteData = turn.note as { name: string; description: string | null } | null;
  const intervalData = turn.interval as { name: string } | null;

  return (
    <div className="mx-auto max-w-lg space-y-6">
      <Button
        render={<Link href="/mis-turnos" />}
        nativeButton={false}
        variant="ghost"
        size="sm"
        className="rounded-xl"
      >
        <ArrowLeft className="mr-1 h-4 w-4" />
        Mis Turnos
      </Button>

      <div className="space-y-4 rounded-2xl border bg-white p-6 shadow-sm">
        <div className="flex items-start justify-between gap-3">
          <div>
            <h1 className="text-xl font-bold">{noteData?.name ?? "Trámite"}</h1>
            {intervalData && <p className="text-muted-foreground text-sm">{intervalData.name}</p>}
          </div>
          <span className={`rounded-full px-3 py-1 text-xs font-medium ${cfg.color}`}>
            {cfg.label}
          </span>
        </div>

        <div className="space-y-2 text-sm">
          <div className="flex justify-between">
            <span className="text-muted-foreground">Fecha y hora</span>
            <span className="font-medium">
              {format(new Date(turn.date), "EEEE d 'de' MMMM, HH:mm", { locale: es })}
            </span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground">ID de turno</span>
            <span className="font-mono text-xs">#{turn.id.slice(0, 8).toUpperCase()}</span>
          </div>
          {noteData?.description && (
            <p className="text-muted-foreground border-t pt-2 text-xs">{noteData.description}</p>
          )}
        </div>

        <div className="border-t pt-3">
          {turn.status === "pending" ? (
            <TurnDetailClient turnId={turn.id} />
          ) : (
            <Button
              render={<Link href="/sacar-turno" />}
              nativeButton={false}
              className="w-full rounded-xl bg-[#E94A1F] text-white hover:bg-[#c73d18]"
            >
              Sacar otro turno
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}
