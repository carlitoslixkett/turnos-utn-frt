"use client";

import { useState } from "react";
import { toast } from "sonner";
import { Plus, Shield, ShieldOff, UserX, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import type { Profile } from "@/types";

interface WorkerWithRoles extends Profile {
  worker_roles: { role: string }[];
}

interface WorkersClientProps {
  initialWorkers: WorkerWithRoles[];
}

const EMPTY_FORM = { full_name: "", email: "", dni: "", password: "" };

export function WorkersClient({ initialWorkers }: WorkersClientProps) {
  const [workers, setWorkers] = useState<WorkerWithRoles[]>(initialWorkers);
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState(EMPTY_FORM);
  const [loading, setLoading] = useState(false);

  async function createWorker(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    try {
      const res = await fetch("/api/workers", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      const json = await res.json();
      if (!res.ok) {
        toast.error(json.error);
        return;
      }
      toast.success("Empleado creado. Ya puede iniciar sesión.");
      setForm(EMPTY_FORM);
      setOpen(false);
      // Reload to get full profile data
      window.location.reload();
    } finally {
      setLoading(false);
    }
  }

  async function toggleAdmin(worker: WorkerWithRoles) {
    const isAdmin = worker.worker_roles.some((r) => r.role === "admin");
    const res = await fetch(`/api/workers/${worker.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ is_admin: !isAdmin }),
    });
    if (!res.ok) {
      const j = await res.json();
      toast.error(j.error);
      return;
    }
    setWorkers((prev) =>
      prev.map((w) =>
        w.id === worker.id
          ? {
              ...w,
              worker_roles: isAdmin ? [] : [{ role: "admin" }],
            }
          : w
      )
    );
    toast.success(isAdmin ? "Rol admin removido" : "Rol admin asignado");
  }

  async function hardDelete(worker: WorkerWithRoles) {
    if (
      !confirm(`¿Eliminar definitivamente a ${worker.full_name}? Esta acción no se puede deshacer.`)
    )
      return;
    if (!confirm(`Confirmá una vez más: escribí OK mentalmente. ¿Eliminar a ${worker.full_name}?`))
      return;
    const res = await fetch(`/api/workers/${worker.id}`, { method: "DELETE" });
    if (!res.ok) {
      const j = await res.json();
      toast.error(j.error);
      return;
    }
    setWorkers((prev) => prev.filter((w) => w.id !== worker.id));
    toast.success(`${worker.full_name} eliminado.`);
  }

  async function deactivate(worker: WorkerWithRoles) {
    if (!confirm(`¿Desactivar a ${worker.full_name}? No podrá iniciar sesión.`)) return;
    const res = await fetch(`/api/workers/${worker.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ deactivate: true }),
    });
    if (!res.ok) {
      const j = await res.json();
      toast.error(j.error);
      return;
    }
    setWorkers((prev) => prev.filter((w) => w.id !== worker.id));
    toast.success(`${worker.full_name} fue desactivado.`);
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Gestión de Empleados</h1>
          <p className="text-muted-foreground text-sm">Administración de cuentas del personal</p>
        </div>
        <Button onClick={() => setOpen(true)}>
          <Plus className="mr-2 h-4 w-4" />
          Nuevo empleado
        </Button>
      </div>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Crear empleado</DialogTitle>
          </DialogHeader>
          <form onSubmit={createWorker} className="space-y-4">
            <div className="space-y-1">
              <Label htmlFor="w-name">Nombre completo</Label>
              <Input
                id="w-name"
                value={form.full_name}
                onChange={(e) => setForm((f) => ({ ...f, full_name: e.target.value }))}
                required
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label htmlFor="w-dni">DNI</Label>
                <Input
                  id="w-dni"
                  value={form.dni}
                  onChange={(e) => setForm((f) => ({ ...f, dni: e.target.value }))}
                  placeholder="12345678"
                  required
                />
              </div>
              <div className="space-y-1">
                <Label htmlFor="w-email">Email institucional</Label>
                <Input
                  id="w-email"
                  type="email"
                  value={form.email}
                  onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))}
                  placeholder="nombre@frt.utn.edu.ar"
                  required
                />
              </div>
            </div>
            <div className="space-y-1">
              <Label htmlFor="w-pass">Contraseña temporal</Label>
              <Input
                id="w-pass"
                type="password"
                value={form.password}
                onChange={(e) => setForm((f) => ({ ...f, password: e.target.value }))}
                placeholder="Mínimo 8 chars, 1 mayúscula, 1 número"
                required
              />
            </div>
            <Button type="submit" disabled={loading} className="w-full">
              {loading ? "Creando..." : "Crear empleado"}
            </Button>
          </form>
        </DialogContent>
      </Dialog>

      <div className="rounded-xl border bg-white">
        {workers.length === 0 ? (
          <div className="text-muted-foreground py-12 text-center text-sm">
            No hay empleados registrados.
          </div>
        ) : (
          <ul className="divide-y">
            {workers.map((worker) => {
              const isAdmin = worker.worker_roles.some((r) => r.role === "admin");
              return (
                <li key={worker.id} className="flex items-center justify-between px-4 py-3">
                  <div>
                    <div className="flex items-center gap-2">
                      <p className="font-medium">{worker.full_name}</p>
                      {isAdmin && (
                        <Badge variant="default" className="text-xs">
                          Admin
                        </Badge>
                      )}
                    </div>
                    <p className="text-muted-foreground text-sm">DNI: {worker.dni}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => toggleAdmin(worker)}
                      aria-label={isAdmin ? "Quitar admin" : "Asignar admin"}
                      title={isAdmin ? "Quitar admin" : "Asignar admin"}
                      className="text-muted-foreground hover:text-foreground transition-colors"
                    >
                      {isAdmin ? <ShieldOff className="h-5 w-5" /> : <Shield className="h-5 w-5" />}
                    </button>
                    <button
                      onClick={() => deactivate(worker)}
                      aria-label="Desactivar empleado"
                      title="Desactivar empleado"
                      className="text-muted-foreground hover:text-destructive transition-colors"
                    >
                      <UserX className="h-5 w-5" />
                    </button>
                    <button
                      onClick={() => hardDelete(worker)}
                      aria-label="Eliminar definitivamente"
                      title="Eliminar definitivamente"
                      className="text-muted-foreground hover:text-destructive transition-colors"
                    >
                      <Trash2 className="h-5 w-5" />
                    </button>
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </div>
  );
}
