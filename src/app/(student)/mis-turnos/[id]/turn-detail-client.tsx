"use client";

import { useState } from "react";
import { toast } from "sonner";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { XCircle } from "lucide-react";

export function TurnDetailClient({ turnId }: { turnId: string }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [securityCode, setSecurityCode] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleCancel(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    try {
      const res = await fetch(`/api/turns/${turnId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "cancel", security_code: securityCode }),
      });
      const json = await res.json();
      if (!res.ok) {
        toast.error(json.error);
        return;
      }
      toast.success("Turno cancelado exitosamente");
      setOpen(false);
      router.refresh();
    } finally {
      setLoading(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger render={<Button variant="destructive" className="w-full rounded-xl" />}>
        <XCircle className="mr-2 h-4 w-4" />
        Cancelar turno
      </DialogTrigger>
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
              onClick={() => setOpen(false)}
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
  );
}
