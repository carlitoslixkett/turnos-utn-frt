"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Plus, Trash2, AlertTriangle, CalendarOff, Clock } from "lucide-react";
import { format } from "date-fns";
import { es } from "date-fns/locale";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";

export interface ClosureRow {
  id: string;
  date_start: string; // YYYY-MM-DD
  date_end: string;
  all_day: boolean;
  start_time: string | null;
  end_time: string | null;
  reason: string;
  created_at: string;
}

interface Props {
  initialUpcoming: ClosureRow[];
  initialPast: ClosureRow[];
  todayIso: string;
}

function fmtDate(yyyymmdd: string) {
  return format(new Date(`${yyyymmdd}T12:00:00`), "EEEE d 'de' MMMM yyyy", { locale: es });
}

function fmtRange(c: ClosureRow) {
  if (c.date_start === c.date_end) return fmtDate(c.date_start);
  return `${fmtDate(c.date_start)} → ${fmtDate(c.date_end)}`;
}

export function CierresClient({ initialUpcoming, initialPast, todayIso }: Props) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [deleting, setDeleting] = useState<string | null>(null);

  // Confirmation phase: how many turns will be cancelled
  const [pendingConfirm, setPendingConfirm] = useState<{
    affected: number;
    payload: SubmitPayload;
  } | null>(null);

  const [form, setForm] = useState({
    date_start: todayIso,
    date_end: todayIso,
    all_day: true,
    start_time: "09:00",
    end_time: "12:00",
    reason: "",
  });

  type SubmitPayload = {
    date_start: string;
    date_end: string;
    all_day: boolean;
    start_time?: string | null;
    end_time?: string | null;
    reason: string;
    confirm: boolean;
  };

  function resetForm() {
    setForm({
      date_start: todayIso,
      date_end: todayIso,
      all_day: true,
      start_time: "09:00",
      end_time: "12:00",
      reason: "",
    });
  }

  async function submit(payload: SubmitPayload) {
    setSubmitting(true);
    try {
      const res = await fetch("/api/closures", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const json = await res.json();
      if (!res.ok) {
        toast.error(json.error ?? "Error al crear el cierre");
        return false;
      }
      // Phase 1 (dry run)
      if (!payload.confirm) {
        if (json.requires_confirmation) {
          setPendingConfirm({ affected: json.affected_count, payload });
        } else {
          // No turns affected → create immediately
          await submit({ ...payload, confirm: true });
        }
        return true;
      }
      // Phase 2 (created)
      toast.success(
        json.cancelled_count > 0
          ? `Cierre creado. ${json.cancelled_count} turno(s) cancelado(s) y notificado(s).`
          : "Cierre creado."
      );
      setOpen(false);
      setPendingConfirm(null);
      resetForm();
      router.refresh();
      return true;
    } finally {
      setSubmitting(false);
    }
  }

  async function handleSubmitForm(e: React.FormEvent) {
    e.preventDefault();
    if (!form.reason.trim()) {
      toast.error("Indicá el motivo del cierre");
      return;
    }
    if (form.date_end < form.date_start) {
      toast.error("La fecha de fin debe ser igual o posterior a la de inicio");
      return;
    }
    if (!form.all_day && form.start_time >= form.end_time) {
      toast.error("La hora de inicio debe ser menor a la de fin");
      return;
    }

    const payload: SubmitPayload = {
      date_start: form.date_start,
      date_end: form.date_end,
      all_day: form.all_day,
      start_time: form.all_day ? null : form.start_time,
      end_time: form.all_day ? null : form.end_time,
      reason: form.reason.trim(),
      confirm: false,
    };
    await submit(payload);
  }

  async function deleteClosure(id: string) {
    if (!confirm("¿Eliminar este cierre? Los turnos cancelados no se restauran.")) return;
    setDeleting(id);
    try {
      const res = await fetch(`/api/closures/${id}`, { method: "DELETE" });
      const json = await res.json();
      if (!res.ok) {
        toast.error(json.error ?? "Error al eliminar");
        return;
      }
      toast.success("Cierre eliminado");
      router.refresh();
    } finally {
      setDeleting(null);
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-3xl font-bold">Cierres / Paros</h1>
          <p className="text-muted-foreground mt-1 text-sm">
            Bloqueá días u horarios en los que la oficina no atiende. Los turnos pendientes
            afectados se cancelan y al estudiante le llega un email con el motivo.
          </p>
        </div>
        <Button
          onClick={() => setOpen(true)}
          className="rounded-xl bg-[#E94A1F] font-bold text-white hover:bg-[#c73d18]"
        >
          <Plus className="mr-2 h-4 w-4" />
          Agregar cierre
        </Button>
      </div>

      {/* Upcoming */}
      <section>
        <h2 className="mb-3 text-lg font-semibold">Próximos / vigentes</h2>
        {initialUpcoming.length === 0 ? (
          <Card className="rounded-2xl border-dashed">
            <CardContent className="py-10 text-center">
              <CalendarOff className="text-muted-foreground/40 mx-auto mb-3 h-12 w-12" />
              <p className="text-muted-foreground">No hay cierres programados.</p>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-2">
            {initialUpcoming.map((c) => (
              <ClosureCard
                key={c.id}
                closure={c}
                onDelete={() => deleteClosure(c.id)}
                deleting={deleting === c.id}
              />
            ))}
          </div>
        )}
      </section>

      {/* Past (history) */}
      {initialPast.length > 0 && (
        <section>
          <h2 className="mb-3 text-lg font-semibold">Cierres pasados</h2>
          <div className="space-y-2 opacity-75">
            {initialPast.map((c) => (
              <ClosureCard
                key={c.id}
                closure={c}
                onDelete={() => deleteClosure(c.id)}
                deleting={deleting === c.id}
                muted
              />
            ))}
          </div>
        </section>
      )}

      {/* Create dialog */}
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Nuevo cierre</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmitForm} className="space-y-4">
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="space-y-1">
                <Label htmlFor="ds">Desde</Label>
                <Input
                  id="ds"
                  type="date"
                  min={todayIso}
                  value={form.date_start}
                  onChange={(e) => setForm((p) => ({ ...p, date_start: e.target.value }))}
                  required
                />
              </div>
              <div className="space-y-1">
                <Label htmlFor="de">Hasta</Label>
                <Input
                  id="de"
                  type="date"
                  min={form.date_start || todayIso}
                  value={form.date_end}
                  onChange={(e) => setForm((p) => ({ ...p, date_end: e.target.value }))}
                  required
                />
              </div>
            </div>

            <div className="flex items-center gap-2 rounded-xl border bg-white p-3">
              <input
                id="all_day"
                type="checkbox"
                checked={form.all_day}
                onChange={(e) => setForm((p) => ({ ...p, all_day: e.target.checked }))}
              />
              <Label htmlFor="all_day" className="cursor-pointer">
                Cierre de día completo
              </Label>
            </div>

            {!form.all_day && (
              <div className="grid gap-3 sm:grid-cols-2">
                <div className="space-y-1">
                  <Label htmlFor="st">
                    <Clock className="mr-1 inline h-3.5 w-3.5" /> Desde (hora)
                  </Label>
                  <Input
                    id="st"
                    type="time"
                    value={form.start_time}
                    onChange={(e) => setForm((p) => ({ ...p, start_time: e.target.value }))}
                  />
                </div>
                <div className="space-y-1">
                  <Label htmlFor="et">Hasta (hora)</Label>
                  <Input
                    id="et"
                    type="time"
                    value={form.end_time}
                    onChange={(e) => setForm((p) => ({ ...p, end_time: e.target.value }))}
                  />
                </div>
              </div>
            )}

            <div className="space-y-1">
              <Label htmlFor="reason">Motivo</Label>
              <Textarea
                id="reason"
                rows={3}
                placeholder="Ej: Paro docente, Feriado, Reunión interna..."
                value={form.reason}
                onChange={(e) => setForm((p) => ({ ...p, reason: e.target.value }))}
                required
              />
              <p className="text-muted-foreground text-xs">
                Este motivo se le envía por email al estudiante si su turno se cancela.
              </p>
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <Button type="button" variant="outline" onClick={() => setOpen(false)}>
                Cancelar
              </Button>
              <Button
                type="submit"
                disabled={submitting}
                className="bg-[#E94A1F] text-white hover:bg-[#c73d18]"
              >
                {submitting ? "Guardando..." : "Continuar"}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* Confirmation: turns will be cancelled */}
      <Dialog open={!!pendingConfirm} onOpenChange={(v) => !v && setPendingConfirm(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-amber-700">
              <AlertTriangle className="h-5 w-5" />
              Atención
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-3 text-sm">
            <p>
              Este cierre va a <strong>cancelar {pendingConfirm?.affected} turno(s)</strong> que ya
              estaban reservados.
            </p>
            <p className="text-muted-foreground">
              Los estudiantes afectados recibirán un email con el motivo del cierre.
            </p>
          </div>
          <div className="flex justify-end gap-2 pt-3">
            <Button variant="outline" onClick={() => setPendingConfirm(null)} disabled={submitting}>
              No, volver
            </Button>
            <Button
              onClick={() => pendingConfirm && submit({ ...pendingConfirm.payload, confirm: true })}
              disabled={submitting}
              className="bg-red-600 text-white hover:bg-red-700"
            >
              {submitting ? "Cancelando..." : "Sí, cerrar y cancelar turnos"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function ClosureCard({
  closure,
  onDelete,
  deleting,
  muted,
}: {
  closure: ClosureRow;
  onDelete: () => void;
  deleting: boolean;
  muted?: boolean;
}) {
  return (
    <Card className={`rounded-xl ${muted ? "" : "border-amber-200 bg-amber-50/40"}`}>
      <CardHeader className="pb-2">
        <div className="flex items-start justify-between gap-3">
          <div>
            <CardTitle className="text-base capitalize">{fmtRange(closure)}</CardTitle>
            <p className="text-muted-foreground mt-0.5 text-xs">
              {closure.all_day ? (
                <Badge className="bg-red-100 text-red-700">Día completo</Badge>
              ) : (
                <Badge className="bg-amber-100 text-amber-800">
                  Parcial {closure.start_time?.slice(0, 5)} – {closure.end_time?.slice(0, 5)}
                </Badge>
              )}
            </p>
          </div>
          <Button
            size="sm"
            variant="outline"
            onClick={onDelete}
            disabled={deleting}
            className="text-red-600 hover:bg-red-50"
            aria-label="Eliminar cierre"
          >
            <Trash2 className="h-4 w-4" />
          </Button>
        </div>
      </CardHeader>
      <CardContent className="pt-0">
        <p className="text-sm">
          <span className="font-medium">Motivo:</span> {closure.reason}
        </p>
      </CardContent>
    </Card>
  );
}
