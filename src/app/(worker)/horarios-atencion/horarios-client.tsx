"use client";

import { useState } from "react";
import { toast } from "sonner";
import { Plus, Trash2, Clock, Save } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

interface AttentionWindow {
  weekday: number;
  start_time: string;
  end_time: string;
}

// UI-side block: multi-day toggle + one time range, expanded into multiple
// (weekday, start, end) entries on save.
interface Block {
  days: number[]; // 1..7 (ISO)
  start_time: string;
  end_time: string;
}

const WEEKDAYS = [
  { value: 1, short: "Lun" },
  { value: 2, short: "Mar" },
  { value: 3, short: "Mié" },
  { value: 4, short: "Jue" },
  { value: 5, short: "Vie" },
  { value: 6, short: "Sáb" },
  { value: 7, short: "Dom" },
];

function windowsToBlocks(windows: AttentionWindow[]): Block[] {
  const map = new Map<string, Block>();
  for (const w of windows) {
    const key = `${w.start_time}-${w.end_time}`;
    const existing = map.get(key);
    if (existing) existing.days.push(w.weekday);
    else map.set(key, { days: [w.weekday], start_time: w.start_time, end_time: w.end_time });
  }
  return Array.from(map.values()).map((b) => ({
    ...b,
    days: [...b.days].sort((a, b) => a - b),
  }));
}

function blocksToWindows(blocks: Block[]): AttentionWindow[] {
  const out: AttentionWindow[] = [];
  for (const b of blocks) {
    for (const d of b.days) {
      out.push({ weekday: d, start_time: b.start_time, end_time: b.end_time });
    }
  }
  return out;
}

export function HorariosClient({
  initialWindows,
  initialDuration,
}: {
  initialWindows: AttentionWindow[];
  initialDuration: number;
}) {
  const [blocks, setBlocks] = useState<Block[]>(
    initialWindows.length > 0
      ? windowsToBlocks(initialWindows)
      : [{ days: [1, 2, 3, 4, 5], start_time: "09:00", end_time: "12:00" }]
  );
  const [duration, setDuration] = useState(initialDuration);
  const [saving, setSaving] = useState(false);

  function toggleDay(idx: number, day: number) {
    setBlocks((prev) =>
      prev.map((b, i) =>
        i === idx
          ? {
              ...b,
              days: b.days.includes(day)
                ? b.days.filter((d) => d !== day)
                : [...b.days, day].sort((a, b) => a - b),
            }
          : b
      )
    );
  }

  function updateBlock(idx: number, patch: Partial<Block>) {
    setBlocks((prev) => prev.map((b, i) => (i === idx ? { ...b, ...patch } : b)));
  }

  function addBlock() {
    setBlocks((prev) => [
      ...prev,
      { days: [1, 2, 3, 4, 5], start_time: "16:00", end_time: "20:00" },
    ]);
  }

  function removeBlock(idx: number) {
    setBlocks((prev) => prev.filter((_, i) => i !== idx));
  }

  async function save() {
    for (const b of blocks) {
      if (b.days.length === 0) {
        toast.error("Cada bloque tiene que tener al menos un día seleccionado");
        return;
      }
      if (b.start_time >= b.end_time) {
        toast.error("La hora de fin debe ser posterior a la de inicio");
        return;
      }
    }
    // Detect duplicate (day, time) entries across blocks
    const windows = blocksToWindows(blocks);
    const keys = new Set<string>();
    for (const w of windows) {
      const k = `${w.weekday}-${w.start_time}-${w.end_time}`;
      if (keys.has(k)) {
        toast.error("Hay días repetidos con el mismo horario en distintos bloques");
        return;
      }
      keys.add(k);
    }

    if (duration < 5 || duration > 120) {
      toast.error("La duración debe estar entre 5 y 120 minutos");
      return;
    }

    setSaving(true);
    try {
      const res = await fetch("/api/office-settings", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          attention_windows: windows,
          turn_duration_minutes: duration,
        }),
      });
      const json = await res.json();
      if (!res.ok) {
        toast.error(json.error ?? "Error al guardar");
        return;
      }
      toast.success("Horarios actualizados");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="max-w-3xl space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Horarios de Atención</h1>
        <p className="text-muted-foreground text-sm">
          Configurá los días y horas en que se atienden turnos. Aplica a todos los intervalos
          activos.
        </p>
      </div>

      <div className="space-y-3 rounded-xl border bg-white p-4">
        <Label htmlFor="duration" className="text-sm font-medium">
          Duración de cada turno (minutos)
        </Label>
        <p className="text-muted-foreground text-xs">
          Cada turno dura este tiempo. Aplica a todos los trámites.
        </p>
        <Input
          id="duration"
          type="number"
          min={5}
          max={120}
          step={5}
          value={duration}
          onChange={(e) => setDuration(Number(e.target.value))}
          className="max-w-xs"
        />
      </div>

      <div className="space-y-4">
        {blocks.map((block, idx) => (
          <div key={idx} className="space-y-3 rounded-xl border bg-white p-4">
            <div className="flex items-center justify-between">
              <Label className="flex items-center gap-2 text-sm">
                <Clock className="h-4 w-4" />
                Bloque {idx + 1}
              </Label>
              {blocks.length > 1 && (
                <button
                  type="button"
                  onClick={() => removeBlock(idx)}
                  aria-label="Eliminar bloque"
                  className="text-muted-foreground hover:text-destructive p-1"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              )}
            </div>

            <div className="space-y-2">
              <Label className="text-muted-foreground text-xs">Días</Label>
              <div className="flex flex-wrap gap-2">
                {WEEKDAYS.map((d) => {
                  const active = block.days.includes(d.value);
                  return (
                    <button
                      key={d.value}
                      type="button"
                      onClick={() => toggleDay(idx, d.value)}
                      className={`rounded-full border px-3 py-1 text-xs font-medium transition-colors ${
                        active
                          ? "border-[#E94A1F] bg-[#E94A1F] text-white"
                          : "border-border text-foreground hover:border-[#E94A1F]"
                      }`}
                    >
                      {d.short}
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label className="text-muted-foreground text-xs">Desde</Label>
                <Input
                  type="time"
                  value={block.start_time}
                  onChange={(e) => updateBlock(idx, { start_time: e.target.value })}
                />
              </div>
              <div className="space-y-1">
                <Label className="text-muted-foreground text-xs">Hasta</Label>
                <Input
                  type="time"
                  value={block.end_time}
                  onChange={(e) => updateBlock(idx, { end_time: e.target.value })}
                />
              </div>
            </div>
          </div>
        ))}

        <Button type="button" variant="outline" onClick={addBlock} className="w-full">
          <Plus className="mr-2 h-4 w-4" />
          Agregar otro bloque
        </Button>
      </div>

      <Button onClick={save} disabled={saving} className="w-full">
        <Save className="mr-2 h-4 w-4" />
        {saving ? "Guardando..." : "Guardar horarios"}
      </Button>
    </div>
  );
}
