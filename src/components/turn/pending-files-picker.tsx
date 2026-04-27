"use client";

import { useRef } from "react";
import { toast } from "sonner";
import { Upload, Camera, Trash2, FileText, Image as ImageIcon } from "lucide-react";
import { Button } from "@/components/ui/button";

const ACCEPT = "image/jpeg,image/png,image/webp,application/pdf";
const ACCEPT_IMAGE = "image/jpeg,image/png,image/webp";
const MAX_BYTES = 10 * 1024 * 1024;
const MAX_FILES = 10;

interface Props {
  files: File[];
  onChange: (files: File[]) => void;
}

function formatSize(bytes: number) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export function PendingFilesPicker({ files, onChange }: Props) {
  const fileRef = useRef<HTMLInputElement>(null);
  const cameraRef = useRef<HTMLInputElement>(null);

  function add(newFiles: FileList | null) {
    if (!newFiles || newFiles.length === 0) return;
    const accepted: File[] = [];
    for (const f of Array.from(newFiles)) {
      if (files.length + accepted.length >= MAX_FILES) {
        toast.error(`Máximo ${MAX_FILES} archivos`);
        break;
      }
      if (f.size > MAX_BYTES) {
        toast.error(`"${f.name}" supera los 10 MB`);
        continue;
      }
      if (!ACCEPT.split(",").includes(f.type)) {
        toast.error(`"${f.name}" no es un tipo permitido`);
        continue;
      }
      accepted.push(f);
    }
    if (accepted.length > 0) onChange([...files, ...accepted]);
  }

  function remove(idx: number) {
    onChange(files.filter((_, i) => i !== idx));
  }

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <p className="text-sm font-medium">Documentos (opcional)</p>
        <span className="text-muted-foreground text-xs">
          {files.length} / {MAX_FILES}
        </span>
      </div>
      <p className="text-muted-foreground text-xs">
        Subí imágenes o PDFs de la documentación. El empleado los va a ver al atenderte y no te van
        a pedir el papel físico.
      </p>

      <div className="flex flex-wrap gap-2">
        <input
          ref={fileRef}
          type="file"
          accept={ACCEPT}
          multiple
          className="hidden"
          onChange={(e) => {
            add(e.target.files);
            e.target.value = "";
          }}
        />
        <input
          ref={cameraRef}
          type="file"
          accept={ACCEPT_IMAGE}
          capture="environment"
          className="hidden"
          onChange={(e) => {
            add(e.target.files);
            e.target.value = "";
          }}
        />
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() => fileRef.current?.click()}
          disabled={files.length >= MAX_FILES}
        >
          <Upload className="mr-1 h-3.5 w-3.5" />
          Subir archivo
        </Button>
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() => cameraRef.current?.click()}
          disabled={files.length >= MAX_FILES}
        >
          <Camera className="mr-1 h-3.5 w-3.5" />
          Tomar foto
        </Button>
      </div>

      {files.length > 0 && (
        <ul className="space-y-1.5">
          {files.map((f, i) => {
            const isPdf = f.type === "application/pdf";
            return (
              <li
                key={`${f.name}-${i}`}
                className="flex items-center gap-2 rounded-lg border bg-white px-3 py-2 text-sm"
              >
                {isPdf ? (
                  <FileText className="text-muted-foreground h-4 w-4 shrink-0" />
                ) : (
                  <ImageIcon className="text-muted-foreground h-4 w-4 shrink-0" />
                )}
                <div className="min-w-0 flex-1">
                  <p className="truncate text-xs font-medium">{f.name}</p>
                  <p className="text-muted-foreground text-[10px]">{formatSize(f.size)}</p>
                </div>
                <button
                  type="button"
                  onClick={() => remove(i)}
                  className="text-muted-foreground hover:text-destructive p-1"
                  aria-label="Quitar"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              </li>
            );
          })}
        </ul>
      )}

      <p className="text-muted-foreground text-[10px]">
        Hasta {MAX_FILES} archivos, máx 10 MB c/u (JPG, PNG, WEBP, PDF)
      </p>
    </div>
  );
}
