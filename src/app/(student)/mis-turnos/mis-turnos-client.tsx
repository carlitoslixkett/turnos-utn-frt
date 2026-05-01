"use client";

import { useState } from "react";
import { toast } from "sonner";
import { CalendarDays, XCircle } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import type { Turn } from "@/types";

interface TurnWithNote extends Turn {
  notes: { id: string; name: string } | null;
  cancel_reason: string | null;
}

const STATUS_LABELS: Record<string, string> = {
  pending: "Pendiente",
  attended: "Atendido",
  lost: "Ausente",
  cancelled: "Cancelado",
};

const STATUS_VARIANTS: Record<string, "default" | "secondary" | "destructive" | "outline"> = {
  pending: "default",
  attended: "outline",
  lost: "secondary",
  cancelled: "destructive",
};

interface MisTurnosClientProps {
  initialTurns: TurnWithNote[];
}

export function MisTurnosClient({ initialTurns }: MisTurnosClientProps) {
  const [turns, setTurns] = useState<TurnWithNote[]>(initialTurns);
  const [cancelTarget, setCancelTarget] = useState<TurnWithNote | null>(null);
  const [securityCode, setSecurityCode] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleCancel(e: React.FormEvent) {
    e.preventDefault();
    if (!cancelTarget) return;
    setLoading(true);
    try {
      const res = await fetch(`/api/turns/${cancelTarget.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "cancel", security_code: securityCode }),
      });
      const json = await res.json();
      if (!res.ok) {
        toast.error(json.error);
        return;
      }
      setTurns((prev) =>
        prev.map((t) => (t.id === cancelTarget.id ? { ...t, status: "cancelled" } : t))
      );
      setCancelTarget(null);
      setSecurityCode("");
      toast.success("Turno cancelado correctamente");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Mis Turnos</h1>
        <p className="text-muted-foreground text-sm">Historial de todos tus turnos</p>
      </div>

      {turns.length === 0 ? (
        <div className="text-muted-foreground flex flex-col items-center gap-3 py-16">
          <CalendarDays className="h-10 w-10 opacity-30" />
          <p className="text-sm">No tenés turnos registrados.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {turns.map((turn) => (
            <div key={turn.id} className="space-y-2 rounded-xl border bg-white px-4 py-3">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="font-medium">{turn.notes?.name ?? "Trámite"}</p>
                  <p className="text-muted-foreground text-sm">
                    {new Date(turn.date).toLocaleString("es-AR", {
                      dateStyle: "long",
                      timeStyle: "short",
                    })}
                  </p>
                  <p className="text-muted-foreground mt-0.5 font-mono text-xs">
                    #{turn.id.slice(0, 8).toUpperCase()}
                  </p>
                </div>
                <div className="flex flex-col items-end gap-2">
                  <Badge variant={STATUS_VARIANTS[turn.status]}>{STATUS_LABELS[turn.status]}</Badge>
                  {turn.status === "pending" && (
                    <button
                      onClick={() => {
                        setCancelTarget(turn);
                        setSecurityCode("");
                      }}
                      className="text-destructive flex items-center gap-1 text-xs hover:opacity-80"
                    >
                      <XCircle className="h-3 w-3" />
                      Cancelar
                    </button>
                  )}
                </div>
              </div>
              {turn.status === "cancelled" && turn.cancel_reason && (
                <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm">
                  <p className="font-medium text-red-900">
                    Tu turno fue cancelado por el Departamento de Alumnos.
                  </p>
                  <p className="mt-0.5 text-red-800">
                    <span className="font-medium">Motivo:</span> {turn.cancel_reason}
                  </p>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Cancel dialog */}
      <Dialog
        open={!!cancelTarget}
        onOpenChange={(open) => {
          if (!open) setCancelTarget(null);
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Cancelar turno</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleCancel} className="space-y-4">
            <p className="text-muted-foreground text-sm">
              Ingresá el código de seguridad de 6 dígitos que recibiste al sacar el turno. Tenés un
              máximo de 3 intentos.
            </p>
            <div className="space-y-1">
              <Label htmlFor="sec-code">Código de seguridad</Label>
              <Input
                id="sec-code"
                type="text"
                inputMode="numeric"
                maxLength={6}
                pattern="\d{6}"
                value={securityCode}
                onChange={(e) => setSecurityCode(e.target.value.replace(/\D/g, ""))}
                placeholder="000000"
                className="text-center font-mono text-lg tracking-widest"
                required
              />
            </div>
            <div className="flex gap-3">
              <Button
                type="button"
                variant="outline"
                className="flex-1"
                onClick={() => setCancelTarget(null)}
              >
                Volver
              </Button>
              <Button
                type="submit"
                variant="destructive"
                className="flex-1"
                disabled={securityCode.length !== 6 || loading}
              >
                {loading ? "Procesando..." : "Confirmar cancelación"}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
