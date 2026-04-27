"use client";

import { useState, useMemo, useRef } from "react";
import Link from "next/link";
import { toast } from "sonner";
import { CalendarPlus, CheckCircle, Copy, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { PendingFilesPicker } from "@/components/turn/pending-files-picker";

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
  date: string;
  notes?: { name: string } | null;
}

interface Slot {
  interval_id: string;
  interval_name: string;
  date: string;
}

export function SacarTurnoClient({ notes, intervals }: SacarTurnoClientProps) {
  const [selectedNote, setSelectedNote] = useState("");
  const [selectedDay, setSelectedDay] = useState("");
  const [slots, setSlots] = useState<Slot[]>([]);
  const [slotsLoading, setSlotsLoading] = useState(false);
  const [pickedSlot, setPickedSlot] = useState<Slot | null>(null);
  const [pendingFiles, setPendingFiles] = useState<File[]>([]);
  const [loading, setLoading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState<{ done: number; total: number } | null>(
    null
  );
  const [created, setCreated] = useState<CreatedTurn | null>(null);

  const availableNoteIds = useMemo(() => {
    const ids = new Set<string>();
    intervals.forEach((i) => i.interval_notes.forEach((n) => ids.add(n.note_id)));
    return ids;
  }, [intervals]);

  const availableNotes = notes.filter((n) => availableNoteIds.has(n.id));

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

  const requestIdRef = useRef(0);

  async function fetchSlots(noteId: string, day: string) {
    if (!noteId || !day) {
      setSlots([]);
      setPickedSlot(null);
      setSlotsLoading(false);
      return;
    }
    const reqId = ++requestIdRef.current;
    setSlotsLoading(true);
    setPickedSlot(null);
    try {
      const res = await fetch(`/api/turns/slots?note_id=${noteId}&date=${day}`);
      const json = await res.json();
      if (reqId !== requestIdRef.current) return;
      if (!Array.isArray(json.data)) {
        toast.error(json.error ?? "Error obteniendo horarios");
        setSlots([]);
        return;
      }
      setSlots(json.data);
    } catch {
      if (reqId === requestIdRef.current) setSlots([]);
    } finally {
      if (reqId === requestIdRef.current) setSlotsLoading(false);
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!selectedNote || !pickedSlot) return;
    setLoading(true);
    try {
      const res = await fetch("/api/turns", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          note_id: selectedNote,
          selected_date: pickedSlot.date,
          selected_interval_id: pickedSlot.interval_id,
        }),
      });
      const json = await res.json();
      if (!res.ok) {
        toast.error(json.error);
        // refresh slots — someone else may have taken it
        if (selectedDay) {
          const refreshed = await fetch(
            `/api/turns/slots?note_id=${selectedNote}&date=${selectedDay}`
          );
          const refreshedJson = await refreshed.json();
          if (Array.isArray(refreshedJson.data)) setSlots(refreshedJson.data);
          setPickedSlot(null);
        }
        return;
      }

      // Upload any staged documents
      if (pendingFiles.length > 0) {
        setUploadProgress({ done: 0, total: pendingFiles.length });
        let failed = 0;
        for (let i = 0; i < pendingFiles.length; i++) {
          const fd = new FormData();
          fd.append("file", pendingFiles[i]);
          const upRes = await fetch(`/api/turns/${json.data.id}/documents`, {
            method: "POST",
            body: fd,
          });
          if (!upRes.ok) failed++;
          setUploadProgress({ done: i + 1, total: pendingFiles.length });
        }
        if (failed > 0) {
          toast.error(
            `${failed} archivo${failed > 1 ? "s" : ""} no se pudo subir. Subilos desde "Mis Turnos".`
          );
        }
      }

      setCreated(json.data);
    } finally {
      setLoading(false);
      setUploadProgress(null);
    }
  }

  function copyCode() {
    if (!created) return;
    navigator.clipboard.writeText(created.security_code);
    toast.success("Código copiado");
  }

  function reset() {
    setCreated(null);
    setSelectedNote("");
    setSelectedDay("");
    setSlots([]);
    setPickedSlot(null);
    setPendingFiles([]);
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
              {new Date(created.date).toLocaleString("es-AR", {
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

        <div className="flex gap-2">
          <Button variant="outline" className="flex-1" onClick={reset}>
            Sacar otro turno
          </Button>
          <Button
            render={<Link href={`/mis-turnos/${created.id}`} />}
            nativeButton={false}
            className="flex-1"
          >
            Ver detalle
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-md space-y-6 pt-4">
      <div>
        <h1 className="text-2xl font-bold">Sacar turno</h1>
        <p className="text-muted-foreground text-sm">
          Elegí el trámite, el día y un horario disponible
        </p>
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
                    setSelectedDay("");
                    setSlots([]);
                    setPickedSlot(null);
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
              <Label htmlFor="day">Día</Label>
              <Input
                id="day"
                type="date"
                value={selectedDay}
                min={minDate || undefined}
                max={maxDate || undefined}
                onChange={(e) => {
                  const day = e.target.value;
                  setSelectedDay(day);
                  fetchSlots(selectedNote, day);
                }}
                required
              />
            </div>
          )}

          {selectedNote && selectedDay && (
            <div className="space-y-2">
              <Label>Horarios disponibles</Label>
              {slotsLoading ? (
                <div className="text-muted-foreground flex items-center justify-center gap-2 rounded-lg border border-dashed py-6 text-xs">
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  Buscando horarios...
                </div>
              ) : slots.length === 0 ? (
                <p className="text-muted-foreground rounded-lg border border-dashed py-6 text-center text-xs">
                  No hay horarios disponibles para esta fecha. Probá con otro día.
                </p>
              ) : (
                <div className="grid grid-cols-3 gap-2">
                  {slots.map((s) => {
                    const time = new Date(s.date).toLocaleTimeString("es-AR", {
                      hour: "2-digit",
                      minute: "2-digit",
                    });
                    const active = pickedSlot?.date === s.date;
                    return (
                      <button
                        key={`${s.interval_id}-${s.date}`}
                        type="button"
                        onClick={() => setPickedSlot(s)}
                        className={`rounded-lg border px-2 py-2 text-sm font-medium transition-colors ${
                          active
                            ? "border-[#E94A1F] bg-[#E94A1F] text-white"
                            : "border-border hover:border-[#E94A1F]/60"
                        }`}
                      >
                        {time}
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {pickedSlot && (
            <div className="rounded-xl border bg-white p-4">
              <PendingFilesPicker files={pendingFiles} onChange={setPendingFiles} />
            </div>
          )}

          <Button
            type="submit"
            disabled={!selectedNote || !pickedSlot || loading}
            className="w-full"
          >
            {loading
              ? uploadProgress
                ? `Subiendo documentos (${uploadProgress.done}/${uploadProgress.total})...`
                : "Procesando..."
              : "Confirmar turno"}
          </Button>
        </form>
      )}
    </div>
  );
}
