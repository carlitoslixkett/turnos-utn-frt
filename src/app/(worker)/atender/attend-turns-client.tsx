"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { CheckCircle2, XCircle, Clock, User, Ban } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import { toast } from "sonner";
import { TurnDocuments } from "@/components/turn/turn-documents";
import type { Turn } from "@/types";

type TurnWithRelations = Omit<Turn, "note" | "interval" | "profile"> & {
  note: { id: string; name: string } | null;
  profile: { id: string; full_name: string; dni: string; legajo?: string | null } | null;
};

interface Props {
  initialTurns: TurnWithRelations[];
  selectedDay: string;
  today: string;
}

const STATUS_CFG: Record<string, { label: string; classes: string }> = {
  pending: { label: "Pendiente", classes: "bg-yellow-100 text-yellow-800" },
  attended: { label: "Atendido", classes: "bg-green-100 text-green-700" },
  lost: { label: "Ausente", classes: "bg-red-100 text-red-700" },
  cancelled: { label: "Cancelado", classes: "bg-gray-100 text-gray-600" },
};

export function AttendTurnsClient({ initialTurns, selectedDay, today }: Props) {
  const router = useRouter();
  const turns = initialTurns;
  const [loading, setLoading] = useState<string | null>(null);
  const supabase = createClient();
  const isToday = selectedDay === today;

  // Cancel-with-reason dialog state
  const [cancelTarget, setCancelTarget] = useState<TurnWithRelations | null>(null);
  const [cancelReason, setCancelReason] = useState("");
  const [cancelLoading, setCancelLoading] = useState(false);

  async function confirmCancel() {
    if (!cancelTarget) return;
    if (cancelReason.trim().length < 3) {
      toast.error("Indicá un motivo (mínimo 3 caracteres)");
      return;
    }
    setCancelLoading(true);
    try {
      const res = await fetch(`/api/turns/${cancelTarget.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "cancel", reason: cancelReason.trim() }),
      });
      const data = await res.json();
      if (!res.ok) {
        toast.error(data.error ?? "Error al cancelar");
      } else {
        toast.success("Turno cancelado y estudiante notificado");
        setCancelTarget(null);
        setCancelReason("");
        router.refresh();
      }
    } finally {
      setCancelLoading(false);
    }
  }

  // Real-time updates only matter when looking at today
  useEffect(() => {
    if (!isToday) return;
    const channel = supabase
      .channel(`turns-attend-${selectedDay}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "turns" }, () => {
        router.refresh();
      })
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [supabase, router, selectedDay, isToday]);

  const handleAction = useCallback(
    async (turnId: string, action: "attend" | "lost") => {
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
          router.refresh();
        }
      } finally {
        setLoading(null);
      }
    },
    [router]
  );

  const pending = turns.filter((t) => t.status === "pending");
  const nextTurn = pending[0];
  const remainingPending = pending.slice(1);
  const processed = turns.filter((t) => t.status !== "pending");

  // F10 = attend, F12 = lost (only on today)
  useEffect(() => {
    if (!isToday || !nextTurn) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === "F10") {
        e.preventDefault();
        handleAction(nextTurn.id, "attend");
      }
      if (e.key === "F12") {
        e.preventDefault();
        handleAction(nextTurn.id, "lost");
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [nextTurn, handleAction, isToday]);

  function navigateToDay(day: string) {
    const params = new URLSearchParams();
    params.set("date", day);
    router.push(`/atender?${params.toString()}`);
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end gap-3 rounded-xl border bg-white px-4 py-3">
        <div className="space-y-1">
          <Label htmlFor="day">Día</Label>
          <Input
            id="day"
            type="date"
            value={selectedDay}
            onChange={(e) => e.target.value && navigateToDay(e.target.value)}
            className="w-[180px]"
          />
        </div>
        <div className="text-muted-foreground text-xs">
          {format(new Date(`${selectedDay}T12:00:00`), "EEEE d 'de' MMMM yyyy", { locale: es })}
        </div>
        <div className="ml-auto flex gap-2">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => navigateToDay(today)}
            disabled={isToday}
          >
            Hoy
          </Button>
        </div>
      </div>

      {isToday && (
        <div className="text-muted-foreground flex gap-3 text-xs">
          <span className="bg-muted rounded-md px-2 py-1 font-mono">F10</span>
          <span>Atendido</span>
          <span className="bg-muted ml-3 rounded-md px-2 py-1 font-mono">F12</span>
          <span>Ausente</span>
        </div>
      )}

      {/* Next pending turn (only show action card on today) */}
      {nextTurn && isToday ? (
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

            <TurnDocuments turnId={nextTurn.id} readOnly hideIfEmpty />

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
            <Button
              type="button"
              variant="outline"
              onClick={() => setCancelTarget(nextTurn)}
              disabled={!!loading}
              className="w-full text-red-600 hover:bg-red-50"
            >
              <Ban className="mr-2 h-4 w-4" />
              Cancelar turno (con motivo)
            </Button>
          </CardContent>
        </Card>
      ) : turns.length === 0 ? (
        <Card className="rounded-2xl border-dashed">
          <CardContent className="flex flex-col items-center py-12 text-center">
            <Clock className="text-muted-foreground/40 mb-3 h-12 w-12" />
            <p className="text-muted-foreground font-medium">No hay turnos en este día</p>
          </CardContent>
        </Card>
      ) : null}

      {/* Pending list (today: tail of pending; other days: all pending) */}
      {(isToday ? remainingPending : pending).length > 0 && (
        <section>
          <h2 className="mb-3 text-lg font-semibold">
            {isToday
              ? `Pendientes del día (${remainingPending.length})`
              : `Pendientes (${pending.length})`}
          </h2>
          <div className="space-y-2">
            {(isToday ? remainingPending : pending).map((turn) => (
              <TurnRow
                key={turn.id}
                turn={turn}
                onAction={handleAction}
                onCancel={() => setCancelTarget(turn)}
                disabled={!!loading}
                actionable
              />
            ))}
          </div>
        </section>
      )}

      {/* Already processed (attended/lost/cancelled) */}
      {processed.length > 0 && (
        <section>
          <h2 className="mb-3 text-lg font-semibold">Procesados ({processed.length})</h2>
          <div className="space-y-2">
            {processed.map((turn) => (
              <TurnRow
                key={turn.id}
                turn={turn}
                onAction={handleAction}
                onCancel={() => {}}
                disabled
                actionable={false}
              />
            ))}
          </div>
        </section>
      )}

      {/* Manual cancel dialog */}
      <Dialog
        open={!!cancelTarget}
        onOpenChange={(v) => {
          if (!v) {
            setCancelTarget(null);
            setCancelReason("");
          }
        }}
      >
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Cancelar turno</DialogTitle>
          </DialogHeader>
          {cancelTarget && (
            <div className="space-y-3 text-sm">
              <p>
                Vas a cancelar el turno de{" "}
                <strong>{cancelTarget.profile?.full_name ?? "el estudiante"}</strong> (
                {format(new Date(cancelTarget.date), "EEEE d 'de' MMMM, HH:mm", { locale: es })}).
              </p>
              <div className="space-y-1">
                <Label htmlFor="cancel-reason">Motivo (lo recibirá el estudiante por email)</Label>
                <Textarea
                  id="cancel-reason"
                  rows={3}
                  placeholder="Ej: La empleada que atiende este trámite no estará disponible..."
                  value={cancelReason}
                  onChange={(e) => setCancelReason(e.target.value)}
                />
              </div>
            </div>
          )}
          <div className="flex justify-end gap-2 pt-2">
            <Button
              variant="outline"
              onClick={() => {
                setCancelTarget(null);
                setCancelReason("");
              }}
              disabled={cancelLoading}
            >
              Volver
            </Button>
            <Button
              onClick={confirmCancel}
              disabled={cancelLoading}
              className="bg-red-600 text-white hover:bg-red-700"
            >
              {cancelLoading ? "Cancelando..." : "Confirmar cancelación"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function TurnRow({
  turn,
  onAction,
  onCancel,
  disabled,
  actionable,
}: {
  turn: TurnWithRelations;
  onAction: (id: string, a: "attend" | "lost") => void;
  onCancel: () => void;
  disabled: boolean;
  actionable: boolean;
}) {
  const cfg = STATUS_CFG[turn.status as string] ?? STATUS_CFG.pending;
  const cancelReason = (turn as TurnWithRelations & { cancel_reason?: string | null })
    .cancel_reason;
  return (
    <Card className="rounded-xl">
      <CardContent className="px-4 py-3">
        <div className="flex items-center justify-between gap-3">
          <div className="flex min-w-0 items-center gap-4">
            <span className="text-muted-foreground w-12 font-mono text-sm">
              {format(new Date(turn.date), "HH:mm")}
            </span>
            <div className="min-w-0">
              <p className="truncate text-sm font-medium">{turn.note?.name}</p>
              <p className="text-muted-foreground truncate text-xs">
                {turn.profile?.full_name} · DNI {turn.profile?.dni}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Badge className={cfg.classes}>{cfg.label}</Badge>
            {actionable && turn.status === "pending" && (
              <>
                <Button
                  size="sm"
                  onClick={() => onAction(turn.id, "attend")}
                  disabled={disabled}
                  className="rounded-xl bg-green-600 text-white hover:bg-green-700"
                  aria-label="Atendido"
                >
                  <CheckCircle2 className="h-4 w-4" />
                </Button>
                <Button
                  size="sm"
                  onClick={() => onAction(turn.id, "lost")}
                  disabled={disabled}
                  className="rounded-xl bg-red-600 text-white hover:bg-red-700"
                  aria-label="Ausente"
                >
                  <XCircle className="h-4 w-4" />
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={onCancel}
                  disabled={disabled}
                  className="rounded-xl text-red-600 hover:bg-red-50"
                  aria-label="Cancelar con motivo"
                  title="Cancelar turno"
                >
                  <Ban className="h-4 w-4" />
                </Button>
              </>
            )}
          </div>
        </div>
        {turn.status === "cancelled" && cancelReason && (
          <p className="text-muted-foreground mt-2 text-xs italic">Motivo: {cancelReason}</p>
        )}
        <div className="mt-2">
          <TurnDocuments turnId={turn.id} readOnly hideIfEmpty />
        </div>
      </CardContent>
    </Card>
  );
}
