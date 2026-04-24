"use client";

import { useCallback, useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { CheckCircle2, XCircle, Clock, User } from "lucide-react";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import { toast } from "sonner";
import type { Turn } from "@/types";

type TurnWithRelations = Omit<Turn, "note" | "interval" | "profile"> & {
  note: { id: string; name: string } | null;
  profile: { id: string; full_name: string; dni: string; legajo?: string | null } | null;
};

interface Props {
  initialTurns: TurnWithRelations[];
}

export function AttendTurnsClient({ initialTurns }: Props) {
  const [turns, setTurns] = useState<TurnWithRelations[]>(initialTurns);
  const [loading, setLoading] = useState<string | null>(null);
  const supabase = createClient();

  // Real-time subscription
  useEffect(() => {
    const channel = supabase
      .channel("turns-attend")
      .on("postgres_changes", { event: "*", schema: "public", table: "turns" }, async () => {
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const todayEnd = new Date(today);
        todayEnd.setHours(23, 59, 59, 999);

        const { data } = await supabase
          .from("turns")
          .select("*, note:notes(id, name), profile:profiles(id, full_name, dni, legajo)")
          .eq("status", "pending")
          .gte("date", today.toISOString())
          .lte("date", todayEnd.toISOString())
          .order("date", { ascending: true });

        if (data) setTurns(data as unknown as TurnWithRelations[]);
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [supabase]);

  const handleAction = useCallback(async (turnId: string, action: "attend" | "lost") => {
    setLoading(turnId);
    try {
      const res = await fetch(`/api/turns/${turnId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action }),
      });
      const data = await res.json();
      if (!res.ok) {
        toast.error(data.error ?? "Error al procesar el turno");
      } else {
        toast.success(action === "attend" ? "Turno atendido ✓" : "Turno marcado como ausente");
        setTurns((prev) => prev.filter((t) => t.id !== turnId));
      }
    } finally {
      setLoading(null);
    }
  }, []);

  // F10 = attend, F12 = lost (for the first/highlighted turn)
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (!turns[0]) return;
      if (e.key === "F10") {
        e.preventDefault();
        handleAction(turns[0].id, "attend");
      }
      if (e.key === "F12") {
        e.preventDefault();
        handleAction(turns[0].id, "lost");
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [turns, handleAction]);

  const nextTurn = turns[0];
  const remaining = turns.slice(1);

  return (
    <div className="space-y-6">
      <div className="text-muted-foreground flex gap-3 text-xs">
        <span className="bg-muted rounded-md px-2 py-1 font-mono">F10</span>
        <span>Atendido</span>
        <span className="bg-muted ml-3 rounded-md px-2 py-1 font-mono">F12</span>
        <span>Ausente</span>
      </div>

      {nextTurn ? (
        <Card className="rounded-2xl border-2 border-[#E94A1F] shadow-lg">
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <span className="rounded-full bg-[#E94A1F] px-3 py-1 text-sm font-medium text-white">
                Próximo turno
              </span>
              <span className="text-muted-foreground text-lg font-bold">
                {format(new Date(nextTurn.date), "HH:mm", { locale: es })}
              </span>
            </div>
            <CardTitle className="mt-2 text-2xl">{nextTurn.note?.name ?? "Trámite"}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="text-muted-foreground flex flex-wrap items-center gap-2">
              <User className="h-4 w-4" />
              <span className="text-foreground font-medium">{nextTurn.profile?.full_name}</span>
              <span>•</span>
              <span>DNI: {nextTurn.profile?.dni}</span>
              {nextTurn.profile?.legajo && (
                <>
                  <span>•</span>
                  <span>Legajo: {nextTurn.profile.legajo}</span>
                </>
              )}
            </div>

            <div className="flex gap-3">
              <Button
                onClick={() => handleAction(nextTurn.id, "attend")}
                disabled={!!loading}
                className="h-14 flex-1 rounded-2xl bg-green-600 text-lg font-bold text-white hover:bg-green-700"
                aria-label="Marcar como atendido (F10)"
              >
                <CheckCircle2 className="mr-2 h-6 w-6" />
                Atendido (F10)
              </Button>
              <Button
                onClick={() => handleAction(nextTurn.id, "lost")}
                disabled={!!loading}
                className="h-14 flex-1 rounded-2xl bg-red-600 text-lg font-bold text-white hover:bg-red-700"
                aria-label="Marcar como ausente (F12)"
              >
                <XCircle className="mr-2 h-6 w-6" />
                Ausente (F12)
              </Button>
            </div>
          </CardContent>
        </Card>
      ) : (
        <Card className="rounded-2xl border-dashed">
          <CardContent className="flex flex-col items-center py-12 text-center">
            <Clock className="text-muted-foreground/40 mb-3 h-12 w-12" />
            <p className="text-muted-foreground font-medium">No hay turnos pendientes por hoy</p>
          </CardContent>
        </Card>
      )}

      {remaining.length > 0 && (
        <section>
          <h2 className="mb-3 text-lg font-semibold">Pendientes del día ({remaining.length})</h2>
          <div className="space-y-2">
            {remaining.map((turn) => (
              <Card key={turn.id} className="rounded-xl">
                <CardContent className="flex items-center justify-between px-4 py-3">
                  <div className="flex items-center gap-4">
                    <span className="text-muted-foreground w-12 font-mono text-sm">
                      {format(new Date(turn.date), "HH:mm")}
                    </span>
                    <div>
                      <p className="text-sm font-medium">{turn.note?.name}</p>
                      <p className="text-muted-foreground text-xs">{turn.profile?.full_name}</p>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <Button
                      size="sm"
                      onClick={() => handleAction(turn.id, "attend")}
                      disabled={!!loading}
                      className="rounded-xl bg-green-600 text-white hover:bg-green-700"
                    >
                      <CheckCircle2 className="h-4 w-4" />
                    </Button>
                    <Button
                      size="sm"
                      onClick={() => handleAction(turn.id, "lost")}
                      disabled={!!loading}
                      className="rounded-xl bg-red-600 text-white hover:bg-red-700"
                    >
                      <XCircle className="h-4 w-4" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
