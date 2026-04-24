"use client";

import { useState, useMemo } from "react";
import { toast } from "sonner";
import { CalendarPlus, CheckCircle, Copy } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";

interface NoteOption {
  id: string;
  name: string;
  description: string | null;
}

interface IntervalOption {
  id: string;
  name: string;
  date_start: string;
  date_end: string;
  turn_duration_minutes: number;
  interval_notes: { note_id: string }[];
}

interface SacarTurnoClientProps {
  notes: NoteOption[];
  intervals: IntervalOption[];
}

interface CreatedTurn {
  id: string;
  security_code: string;
  preferred_date: string;
  notes?: { name: string } | null;
}

export function SacarTurnoClient({ notes, intervals }: SacarTurnoClientProps) {
  const [selectedNote, setSelectedNote] = useState("");
  const [preferredDate, setPreferredDate] = useState("");
  const [loading, setLoading] = useState(false);
  const [created, setCreated] = useState<CreatedTurn | null>(null);

  // Only show notes that have at least one active interval
  const availableNoteIds = useMemo(() => {
    const ids = new Set<string>();
    intervals.forEach((i) => i.interval_notes.forEach((n) => ids.add(n.note_id)));
    return ids;
  }, [intervals]);

  const availableNotes = notes.filter((n) => availableNoteIds.has(n.id));

  // Date bounds for selected note
  const noteIntervals = useMemo(
    () => intervals.filter((i) => i.interval_notes.some((n) => n.note_id === selectedNote)),
    [intervals, selectedNote]
  );

  const minDate = useMemo(() => {
    if (!noteIntervals.length) return "";
    const today = new Date().toISOString().slice(0, 10);
    const earliest = noteIntervals.map((i) => i.date_start.slice(0, 10)).sort()[0];
    return today > earliest ? today : earliest;
  }, [noteIntervals]);

  const maxDate = useMemo(() => {
    if (!noteIntervals.length) return "";
    return (
      noteIntervals
        .map((i) => i.date_end.slice(0, 10))
        .sort()
        .at(-1) ?? ""
    );
  }, [noteIntervals]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!selectedNote || !preferredDate) return;
    setLoading(true);
    try {
      const res = await fetch("/api/turns", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          note_id: selectedNote,
          preferred_date: new Date(preferredDate).toISOString(),
        }),
      });
      const json = await res.json();
      if (!res.ok) {
        toast.error(json.error);
        return;
      }
      setCreated(json.data);
    } finally {
      setLoading(false);
    }
  }

  function copyCode() {
    if (!created) return;
    navigator.clipboard.writeText(created.security_code);
    toast.success("Código copiado");
  }

  if (created) {
    return (
      <div className="mx-auto max-w-md space-y-6 pt-4">
        <div className="flex flex-col items-center gap-3 text-center">
          <CheckCircle className="h-12 w-12 text-green-500" />
          <h1 className="text-2xl font-bold">¡Turno sacado!</h1>
          <p className="text-muted-foreground text-sm">
            Tu turno fue asignado para el{" "}
            <strong>
              {new Date(created.preferred_date).toLocaleString("es-AR", {
                dateStyle: "long",
                timeStyle: "short",
              })}
            </strong>
          </p>
        </div>

        <div className="space-y-2 rounded-xl border bg-amber-50 p-6 text-center">
          <p className="text-sm font-medium text-amber-800">
            Guardá este código para cancelar tu turno si lo necesitás:
          </p>
          <p className="font-mono text-4xl font-bold tracking-widest text-amber-900">
            {created.security_code}
          </p>
          <button
            onClick={copyCode}
            className="mx-auto flex items-center gap-1 text-xs text-amber-700 hover:text-amber-900"
          >
            <Copy className="h-3 w-3" />
            Copiar código
          </button>
          <p className="mt-2 text-xs text-amber-700">
            Este código solo se muestra una vez. No lo compartas.
          </p>
        </div>

        <Button
          className="w-full"
          onClick={() => {
            setCreated(null);
            setSelectedNote("");
            setPreferredDate("");
          }}
        >
          Sacar otro turno
        </Button>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-md space-y-6 pt-4">
      <div>
        <h1 className="text-2xl font-bold">Sacar turno</h1>
        <p className="text-muted-foreground text-sm">Seleccioná el trámite y la fecha preferida</p>
      </div>

      {availableNotes.length === 0 ? (
        <div className="text-muted-foreground flex flex-col items-center gap-3 py-16">
          <CalendarPlus className="h-10 w-10 opacity-30" />
          <p className="text-center text-sm">
            No hay trámites disponibles en este momento. Revisá más tarde.
          </p>
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="space-y-5">
          <div className="space-y-2">
            <Label>Trámite</Label>
            <div className="space-y-2">
              {availableNotes.map((note) => (
                <button
                  key={note.id}
                  type="button"
                  onClick={() => {
                    setSelectedNote(note.id);
                    setPreferredDate("");
                  }}
                  className={`w-full rounded-xl border px-4 py-3 text-left transition-colors ${
                    selectedNote === note.id
                      ? "border-[#E94A1F] bg-[#E94A1F]/5"
                      : "border-border hover:border-[#E94A1F]/50"
                  }`}
                >
                  <p className="text-sm font-medium">{note.name}</p>
                  {note.description && (
                    <p className="text-muted-foreground mt-0.5 text-xs">{note.description}</p>
                  )}
                </button>
              ))}
            </div>
          </div>

          {selectedNote && (
            <div className="space-y-1">
              <Label htmlFor="preferred-date">Fecha preferida</Label>
              <Input
                id="preferred-date"
                type="datetime-local"
                value={preferredDate}
                min={minDate ? `${minDate}T00:00` : undefined}
                max={maxDate ? `${maxDate}T23:59` : undefined}
                onChange={(e) => setPreferredDate(e.target.value)}
                required
              />
              <p className="text-muted-foreground text-xs">
                El sistema asignará el primer turno disponible a partir de esa fecha y hora.
              </p>
            </div>
          )}

          <Button
            type="submit"
            disabled={!selectedNote || !preferredDate || loading}
            className="w-full"
          >
            {loading ? "Procesando..." : "Confirmar turno"}
          </Button>
        </form>
      )}
    </div>
  );
}
