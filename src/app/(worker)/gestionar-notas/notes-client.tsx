"use client";

import { useState } from "react";
import { toast } from "sonner";
import { Plus, ToggleLeft, ToggleRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import type { Note } from "@/types";

interface NotesClientProps {
  initialNotes: Note[];
}

export function NotesClient({ initialNotes }: NotesClientProps) {
  const [notes, setNotes] = useState<Note[]>(initialNotes);
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [loading, setLoading] = useState(false);

  async function createNote(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    try {
      const res = await fetch("/api/notes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, description }),
      });
      const json = await res.json();
      if (!res.ok) {
        toast.error(json.error);
        return;
      }
      setNotes((prev) => [...prev, json.data].sort((a, b) => a.name.localeCompare(b.name)));
      setName("");
      setDescription("");
      setOpen(false);
      toast.success("Nota creada correctamente");
    } finally {
      setLoading(false);
    }
  }

  async function toggleActive(note: Note) {
    const next = !note.is_active;
    const res = await fetch(`/api/notes/${note.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ is_active: next }),
    });
    const json = await res.json();
    if (!res.ok) {
      toast.error(json.error);
      return;
    }
    setNotes((prev) => prev.map((n) => (n.id === note.id ? json.data : n)));
    toast.success(next ? "Nota activada" : "Nota desactivada");
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Notas (Trámites)</h1>
          <p className="text-muted-foreground text-sm">
            Tipos de trámites disponibles para los alumnos
          </p>
        </div>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger render={<Button />}>
            <Plus className="mr-2 h-4 w-4" />
            Nueva nota
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Crear nota</DialogTitle>
            </DialogHeader>
            <form onSubmit={createNote} className="space-y-4">
              <div className="space-y-1">
                <Label htmlFor="name">Nombre</Label>
                <Input
                  id="name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="ej. Ampliación de Cupo"
                  required
                />
              </div>
              <div className="space-y-1">
                <Label htmlFor="description">Descripción</Label>
                <Input
                  id="description"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Descripción breve del trámite"
                />
              </div>
              <Button type="submit" disabled={loading} className="w-full">
                {loading ? "Creando..." : "Crear nota"}
              </Button>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <div className="rounded-xl border bg-white">
        {notes.length === 0 ? (
          <div className="text-muted-foreground py-12 text-center text-sm">
            No hay notas registradas.
          </div>
        ) : (
          <ul className="divide-y">
            {notes.map((note) => (
              <li key={note.id} className="flex items-center justify-between px-4 py-3">
                <div>
                  <p className="font-medium">{note.name}</p>
                  {note.description && (
                    <p className="text-muted-foreground text-sm">{note.description}</p>
                  )}
                </div>
                <div className="flex items-center gap-3">
                  <Badge variant={note.is_active ? "default" : "secondary"}>
                    {note.is_active ? "Activa" : "Inactiva"}
                  </Badge>
                  <button
                    onClick={() => toggleActive(note)}
                    aria-label={note.is_active ? "Desactivar nota" : "Activar nota"}
                    className="text-muted-foreground hover:text-foreground transition-colors"
                  >
                    {note.is_active ? (
                      <ToggleRight className="h-6 w-6 text-[#E94A1F]" />
                    ) : (
                      <ToggleLeft className="h-6 w-6" />
                    )}
                  </button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
