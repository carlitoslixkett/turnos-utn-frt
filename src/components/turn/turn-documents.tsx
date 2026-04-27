"use client";

import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { FileText, Image as ImageIcon, Trash2, Upload, Loader2, ExternalLink } from "lucide-react";
import { Button } from "@/components/ui/button";

interface DocumentItem {
  id: string;
  file_name: string;
  mime_type: string;
  size_bytes: number;
  uploaded_at: string;
  signed_url: string | null;
}

interface Props {
  turnId: string;
  // when true, hides the upload UI (used in worker view)
  readOnly?: boolean;
  // when true, hides the section if there are no docs (worker view)
  hideIfEmpty?: boolean;
}

const ACCEPT = "image/jpeg,image/png,image/webp,application/pdf";
const MAX_BYTES = 10 * 1024 * 1024;

function formatSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export function TurnDocuments({ turnId, readOnly = false, hideIfEmpty = false }: Props) {
  const [docs, setDocs] = useState<DocumentItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  async function load() {
    try {
      const res = await fetch(`/api/turns/${turnId}/documents`);
      const json = await res.json();
      if (Array.isArray(json.data)) setDocs(json.data);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [turnId]);

  async function onFileChosen(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > MAX_BYTES) {
      toast.error("El archivo no puede superar los 10 MB");
      e.target.value = "";
      return;
    }
    setUploading(true);
    try {
      const fd = new FormData();
      fd.append("file", file);
      const res = await fetch(`/api/turns/${turnId}/documents`, { method: "POST", body: fd });
      const json = await res.json();
      if (!res.ok) {
        toast.error(json.error ?? "Error al subir");
        return;
      }
      toast.success("Documento subido");
      await load();
    } finally {
      setUploading(false);
      if (inputRef.current) inputRef.current.value = "";
    }
  }

  async function remove(docId: string) {
    if (!confirm("¿Eliminar este documento?")) return;
    const res = await fetch(`/api/turns/${turnId}/documents/${docId}`, { method: "DELETE" });
    const json = await res.json().catch(() => ({}));
    if (!res.ok) {
      toast.error(json.error ?? "Error al eliminar");
      return;
    }
    setDocs((prev) => prev.filter((d) => d.id !== docId));
    toast.success("Documento eliminado");
  }

  if (loading) {
    return (
      <div className="text-muted-foreground flex items-center gap-2 py-2 text-xs">
        <Loader2 className="h-3.5 w-3.5 animate-spin" />
        Cargando documentos...
      </div>
    );
  }

  if (hideIfEmpty && docs.length === 0) return null;

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <p className="text-sm font-medium">Documentos adjuntos</p>
        {!readOnly && (
          <>
            <input
              ref={inputRef}
              type="file"
              accept={ACCEPT}
              className="hidden"
              onChange={onFileChosen}
            />
            <Button
              type="button"
              variant="outline"
              size="sm"
              disabled={uploading}
              onClick={() => inputRef.current?.click()}
            >
              {uploading ? (
                <>
                  <Loader2 className="mr-1 h-3.5 w-3.5 animate-spin" />
                  Subiendo...
                </>
              ) : (
                <>
                  <Upload className="mr-1 h-3.5 w-3.5" />
                  Subir archivo
                </>
              )}
            </Button>
          </>
        )}
      </div>

      {docs.length === 0 ? (
        <p className="text-muted-foreground rounded-lg border border-dashed py-3 text-center text-xs">
          Sin documentos adjuntos
        </p>
      ) : (
        <ul className="space-y-1.5">
          {docs.map((d) => {
            const isPdf = d.mime_type === "application/pdf";
            return (
              <li
                key={d.id}
                className="flex items-center gap-2 rounded-lg border bg-white px-3 py-2 text-sm"
              >
                {isPdf ? (
                  <FileText className="text-muted-foreground h-4 w-4 shrink-0" />
                ) : (
                  <ImageIcon className="text-muted-foreground h-4 w-4 shrink-0" />
                )}
                <div className="min-w-0 flex-1">
                  <p className="truncate text-xs font-medium">{d.file_name}</p>
                  <p className="text-muted-foreground text-[10px]">
                    {formatSize(d.size_bytes)} · {new Date(d.uploaded_at).toLocaleString("es-AR")}
                  </p>
                </div>
                {d.signed_url && (
                  <a
                    href={d.signed_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-muted-foreground hover:text-foreground p-1"
                    aria-label="Ver"
                  >
                    <ExternalLink className="h-3.5 w-3.5" />
                  </a>
                )}
                {!readOnly && (
                  <button
                    type="button"
                    onClick={() => remove(d.id)}
                    className="text-muted-foreground hover:text-destructive p-1"
                    aria-label="Eliminar"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                )}
              </li>
            );
          })}
        </ul>
      )}

      {!readOnly && (
        <p className="text-muted-foreground text-[10px]">
          Hasta 10 archivos, máx 10 MB c/u (JPG, PNG, WEBP, PDF)
        </p>
      )}
    </div>
  );
}
