"use client";

import { useState } from "react";
import { toast } from "sonner";
import { Plus, Trash2, ToggleLeft, ToggleRight, CalendarRange, Clock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import type { Interval } from "@/types";

const WEEKDAYS = [
  { value: 1, short: "Lun" },
  { value: 2, short: "Mar" },
  { value: 3, short: "Mié" },
  { value: 4, short: "Jue" },
  { value: 5, short: "Vie" },
  { value: 6, short: "Sáb" },
  { value: 7, short: "Dom" },
];

interface NoteOption {
  id: string;
  name: string;
}

interface AttentionWindow {
  weekday: number;
  start_time: string;
  end_time: string;
}

interface IntervalWithNotes extends Omit<Interval, "attention_windows"> {
  attention_windows: AttentionWindow[] | null;
  interval_notes: { note_id: string; notes: { id: string; name: string } | null }[];
}

interface IntervalsClientProps {
  initialIntervals: IntervalWithNotes[];
  notes: NoteOption[];
}

export function IntervalsClient({ initialIntervals, notes }: IntervalsClientProps) {
  const [intervals, setIntervals] = useState<IntervalWithNotes[]>(initialIntervals);
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({
    name: "",
    date_start: "",
    date_end: "",
    turn_duration_minutes: 15,
    attention_windows: [] as AttentionWindow[],
    note_ids: [] as string[],
  });

  function setField<K extends keyof typeof form>(k: K, v: (typeof form)[K]) {
    setForm((prev) => ({ ...prev, [k]: v }));
  }

  function toggleNote(id: string) {
    setForm((prev) => ({
      ...prev,
      note_ids: prev.note_ids.includes(id)
        ? prev.note_ids.filter((n) => n !== id)
        : [...prev.note_ids, id],
    }));
  }

  function addWindow() {
    setForm((prev) => ({
      ...prev,
      attention_windows: [
        ...prev.attention_windows,
        { weekday: 1, start_time: "09:00", end_time: "12:00" },
      ],
    }));
  }

  function updateWindow(idx: number, patch: Partial<AttentionWindow>) {
    setForm((prev) => ({
      ...prev,
      attention_windows: prev.attention_windows.map((w, i) => (i === idx ? { ...w, ...patch } : w)),
    }));
  }

  function removeWindow(idx: number) {
    setForm((prev) => ({
      ...prev,
      attention_windows: prev.attention_windows.filter((_, i) => i !== idx),
    }));
  }

  async function createInterval(e: React.FormEvent) {
    e.preventDefault();
    if (form.note_ids.length === 0) {
      toast.error("Seleccioná al menos un trámite");
      return;
    }
    if (form.attention_windows.length === 0) {
      toast.error("Agregá al menos un horario de atención");
      return;
    }
    for (const w of form.attention_windows) {
      if (w.start_time >= w.end_time) {
        toast.error("Cada horario debe tener fin posterior al inicio");
        return;
      }
    }
    setLoading(true);
    try {
      const body = {
        ...form,
        date_start: new Date(form.date_start).toISOString(),
        date_end: new Date(form.date_end).toISOString(),
      };
      const res = await fetch("/api/intervals", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const json = await res.json();
      if (!res.ok) {
        toast.error(json.error);
        return;
      }
      window.location.reload();
    } finally {
      setLoading(false);
    }
  }

  async function toggleActive(interval: IntervalWithNotes) {
    const next = !interval.is_active;
    const res = await fetch(`/api/intervals/${interval.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ is_active: next }),
    });
    const json = await res.json();
    if (!res.ok) {
      toast.error(json.error);
      return;
    }
    setIntervals((prev) => prev.map((i) => (i.id === interval.id ? { ...i, ...json.data } : i)));
    toast.success(
      next
        ? "Intervalo activado"
        : "Intervalo desactivado. Los turnos pendientes fueron cancelados."
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Intervalos de Atención</h1>
          <p className="text-muted-foreground text-sm">
            Ventanas de tiempo en las que se otorgan turnos
          </p>
        </div>
        <Button onClick={() => setOpen(true)}>
          <Plus className="mr-2 h-4 w-4" />
          Nuevo intervalo
        </Button>
      </div>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-h-[90vh] max-w-lg overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Crear intervalo</DialogTitle>
          </DialogHeader>
          <form onSubmit={createInterval} className="space-y-4">
            <div className="space-y-1">
              <Label htmlFor="int-name">Nombre</Label>
              <Input
                id="int-name"
                value={form.name}
                onChange={(e) => setField("name", e.target.value)}
                placeholder="ej. Inscripción 1er Cuatrimestre 2026"
                required
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label htmlFor="date-start">Apertura</Label>
                <Input
                  id="date-start"
                  type="datetime-local"
                  value={form.date_start}
                  onChange={(e) => setField("date_start", e.target.value)}
                  required
                />
              </div>
              <div className="space-y-1">
                <Label htmlFor="date-end">Cierre</Label>
                <Input
                  id="date-end"
                  type="datetime-local"
                  value={form.date_end}
                  onChange={(e) => setField("date_end", e.target.value)}
                  required
                />
              </div>
            </div>
            <div className="space-y-1">
              <Label htmlFor="duration">Duración del turno (minutos)</Label>
              <Input
                id="duration"
                type="number"
                min={5}
                max={120}
                value={form.turn_duration_minutes}
                onChange={(e) => setField("turn_duration_minutes", Number(e.target.value))}
                required
              />
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label>Horarios de atención</Label>
                <button
                  type="button"
                  onClick={addWindow}
                  className="text-xs font-medium text-[#E94A1F] hover:underline"
                >
                  + Agregar horario
                </button>
              </div>
              {form.attention_windows.length === 0 ? (
                <p className="text-muted-foreground rounded-lg border border-dashed py-3 text-center text-xs">
                  Agregá los días y horas en que se atienden turnos
                </p>
              ) : (
                <div className="space-y-2">
                  {form.attention_windows.map((w, i) => (
                    <div key={i} className="flex items-center gap-2 rounded-lg border p-2">
                      <select
                        value={w.weekday}
                        onChange={(e) => updateWindow(i, { weekday: Number(e.target.value) })}
                        className="border-input bg-background rounded-md border px-2 py-1.5 text-sm"
                      >
                        {WEEKDAYS.map((d) => (
                          <option key={d.value} value={d.value}>
                            {d.short}
                          </option>
                        ))}
                      </select>
                      <Input
                        type="time"
                        value={w.start_time}
                        onChange={(e) => updateWindow(i, { start_time: e.target.value })}
                        className="flex-1"
                        required
                      />
                      <span className="text-muted-foreground text-xs">a</span>
                      <Input
                        type="time"
                        value={w.end_time}
                        onChange={(e) => updateWindow(i, { end_time: e.target.value })}
                        className="flex-1"
                        required
                      />
                      <button
                        type="button"
                        onClick={() => removeWindow(i)}
                        aria-label="Eliminar horario"
                        className="text-muted-foreground hover:text-destructive p-1"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="space-y-2">
              <Label>Trámites asociados</Label>
              <div className="flex flex-wrap gap-2">
                {notes.map((note) => (
                  <button
                    key={note.id}
                    type="button"
                    onClick={() => toggleNote(note.id)}
                    className={`rounded-full border px-3 py-1 text-xs font-medium transition-colors ${
                      form.note_ids.includes(note.id)
                        ? "border-[#E94A1F] bg-[#E94A1F] text-white"
                        : "border-border text-foreground bg-white hover:border-[#E94A1F]"
                    }`}
                  >
                    {note.name}
                  </button>
                ))}
              </div>
            </div>
            <Button type="submit" disabled={loading} className="w-full">
              {loading ? "Creando..." : "Crear intervalo"}
            </Button>
          </form>
        </DialogContent>
      </Dialog>

      <div className="space-y-3">
        {intervals.length === 0 ? (
          <div className="text-muted-foreground rounded-xl border bg-white py-12 text-center text-sm">
            No hay intervalos registrados.
          </div>
        ) : (
          intervals.map((interval) => {
            const associatedNotes = interval.interval_notes
              .map((n) => n.notes?.name)
              .filter(Boolean);
            const windows = Array.isArray(interval.attention_windows)
              ? (interval.attention_windows as AttentionWindow[])
              : [];
            return (
              <div key={interval.id} className="rounded-xl border bg-white px-4 py-3">
                <div className="flex items-start justify-between gap-4">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <CalendarRange className="text-muted-foreground h-4 w-4" />
                      <p className="font-medium">{interval.name}</p>
                      <Badge variant={interval.is_active ? "default" : "secondary"}>
                        {interval.is_active ? "Activo" : "Inactivo"}
                      </Badge>
                    </div>
                    <p className="text-muted-foreground text-sm">
                      {new Date(interval.date_start).toLocaleDateString("es-AR")} →{" "}
                      {new Date(interval.date_end).toLocaleDateString("es-AR")} ·{" "}
                      {interval.turn_duration_minutes} min · {interval.turn_quantity} turnos
                    </p>
                    {windows.length > 0 && (
                      <div className="text-muted-foreground flex flex-wrap items-center gap-1 pt-1 text-xs">
                        <Clock className="h-3 w-3" />
                        {windows.map((w, i) => {
                          const day = WEEKDAYS.find((d) => d.value === w.weekday);
                          return (
                            <span key={i} className="bg-muted rounded px-1.5 py-0.5">
                              {day?.short} {w.start_time}–{w.end_time}
                            </span>
                          );
                        })}
                      </div>
                    )}
                    {associatedNotes.length > 0 && (
                      <div className="flex flex-wrap gap-1 pt-1">
                        {associatedNotes.map((n) => (
                          <Badge key={n} variant="outline" className="text-xs">
                            {n}
                          </Badge>
                        ))}
                      </div>
                    )}
                  </div>
                  <button
                    onClick={() => toggleActive(interval)}
                    aria-label={interval.is_active ? "Desactivar intervalo" : "Activar intervalo"}
                    className="text-muted-foreground hover:text-foreground mt-1 shrink-0 transition-colors"
                  >
                    {interval.is_active ? (
                      <ToggleRight className="h-6 w-6 text-[#E94A1F]" />
                    ) : (
                      <ToggleLeft className="h-6 w-6" />
                    )}
                  </button>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
