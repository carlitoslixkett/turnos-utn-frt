"use client";

import { useState } from "react";
import { toast } from "sonner";
import { Plus, Pencil, Trash2 } from "lucide-react";
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
import type { News } from "@/types";

const STATUS_LABELS: Record<string, string> = {
  pending: "Borrador",
  posted: "Publicada",
  deleted: "Eliminada",
};

const STATUS_VARIANTS: Record<string, "default" | "secondary" | "outline"> = {
  pending: "secondary",
  posted: "default",
  deleted: "outline",
};

interface NewsAdminClientProps {
  initialNews: News[];
}

const EMPTY_FORM = { title: "", description: "", status: "pending" as const, scheduled_at: "" };

export function NewsAdminClient({ initialNews }: NewsAdminClientProps) {
  const [news, setNews] = useState<News[]>(initialNews);
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<News | null>(null);
  const [form, setForm] = useState<{
    title: string;
    description: string;
    status: "pending" | "posted" | "deleted";
    scheduled_at: string;
  }>(EMPTY_FORM);
  const [loading, setLoading] = useState(false);

  function openCreate() {
    setEditing(null);
    setForm(EMPTY_FORM);
    setOpen(true);
  }

  function openEdit(n: News) {
    setEditing(n);
    setForm({
      title: n.title,
      description: n.description,
      status: (n.status as "pending" | "posted" | "deleted") ?? "pending",
      scheduled_at: n.scheduled_at ? n.scheduled_at.slice(0, 16) : "",
    });
    setOpen(true);
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    const body = {
      ...form,
      scheduled_at: form.scheduled_at ? new Date(form.scheduled_at).toISOString() : null,
    };
    try {
      if (editing) {
        const res = await fetch(`/api/news/${editing.id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(body),
        });
        const json = await res.json();
        if (!res.ok) {
          toast.error(json.error);
          return;
        }
        setNews((prev) => prev.map((n) => (n.id === editing.id ? json.data : n)));
        toast.success("Noticia actualizada");
      } else {
        const res = await fetch("/api/news", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(body),
        });
        const json = await res.json();
        if (!res.ok) {
          toast.error(json.error);
          return;
        }
        setNews((prev) => [json.data, ...prev]);
        toast.success("Noticia creada");
      }
      setOpen(false);
    } finally {
      setLoading(false);
    }
  }

  async function deleteNews(n: News) {
    if (!confirm(`¿Eliminar "${n.title}"? Esta acción es irreversible.`)) return;
    const res = await fetch(`/api/news/${n.id}`, { method: "DELETE" });
    if (!res.ok) {
      const j = await res.json();
      toast.error(j.error);
      return;
    }
    setNews((prev) => prev.filter((x) => x.id !== n.id));
    toast.success("Noticia eliminada");
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Noticias</h1>
          <p className="text-muted-foreground text-sm">
            Administración de noticias institucionales
          </p>
        </div>
        <Button onClick={openCreate}>
          <Plus className="mr-2 h-4 w-4" />
          Nueva noticia
        </Button>
      </div>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>{editing ? "Editar noticia" : "Crear noticia"}</DialogTitle>
          </DialogHeader>
          <form onSubmit={submit} className="space-y-4">
            <div className="space-y-1">
              <Label htmlFor="news-title">Título</Label>
              <Input
                id="news-title"
                value={form.title}
                onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
                required
              />
            </div>
            <div className="space-y-1">
              <Label htmlFor="news-desc">Descripción</Label>
              <textarea
                id="news-desc"
                className="border-input bg-background w-full rounded-xl border px-3 py-2 text-sm focus:ring-2 focus:ring-[#E94A1F] focus:outline-none"
                rows={4}
                value={form.description}
                onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
                required
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label htmlFor="news-status">Estado</Label>
                <select
                  id="news-status"
                  className="border-input bg-background w-full rounded-xl border px-3 py-2 text-sm"
                  value={form.status}
                  onChange={(e) =>
                    setForm((f) => ({
                      ...f,
                      status: e.target.value as "pending" | "posted" | "deleted",
                    }))
                  }
                >
                  <option value="pending">Borrador</option>
                  <option value="posted">Publicada</option>
                </select>
              </div>
              <div className="space-y-1">
                <Label htmlFor="news-sched">Publicar el</Label>
                <Input
                  id="news-sched"
                  type="datetime-local"
                  value={form.scheduled_at}
                  onChange={(e) => setForm((f) => ({ ...f, scheduled_at: e.target.value }))}
                />
              </div>
            </div>
            <Button type="submit" disabled={loading} className="w-full">
              {loading ? "Guardando..." : editing ? "Guardar cambios" : "Crear noticia"}
            </Button>
          </form>
        </DialogContent>
      </Dialog>

      <div className="space-y-3">
        {news.length === 0 ? (
          <div className="text-muted-foreground rounded-xl border bg-white py-12 text-center text-sm">
            No hay noticias creadas.
          </div>
        ) : (
          news.map((n) => (
            <div key={n.id} className="rounded-xl border bg-white px-4 py-3">
              <div className="flex items-start justify-between gap-4">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <p className="font-medium">{n.title}</p>
                    <Badge variant={STATUS_VARIANTS[n.status ?? "draft"]}>
                      {STATUS_LABELS[n.status ?? "draft"]}
                    </Badge>
                  </div>
                  <p className="text-muted-foreground line-clamp-2 text-sm">{n.description}</p>
                  <p className="text-muted-foreground text-xs">
                    {new Date(n.created_at).toLocaleDateString("es-AR", {
                      day: "2-digit",
                      month: "short",
                      year: "numeric",
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                  </p>
                </div>
                <div className="flex shrink-0 gap-2">
                  <button
                    onClick={() => openEdit(n)}
                    aria-label="Editar noticia"
                    className="text-muted-foreground hover:text-foreground transition-colors"
                  >
                    <Pencil className="h-4 w-4" />
                  </button>
                  <button
                    onClick={() => deleteNews(n)}
                    aria-label="Eliminar noticia"
                    className="text-muted-foreground hover:text-destructive transition-colors"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
