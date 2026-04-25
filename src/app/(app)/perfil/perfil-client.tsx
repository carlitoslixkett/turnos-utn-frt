"use client";

import { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { updateProfileAction } from "./actions";
import type { Profile } from "@/types";

interface PerfilClientProps {
  profile: Profile;
  email: string;
}

export function PerfilClient({ profile, email }: PerfilClientProps) {
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);
    const formData = new FormData(e.currentTarget);
    try {
      const result = await updateProfileAction(formData);
      if (result?.error) {
        toast.error(result.error);
      } else {
        toast.success("Perfil actualizado correctamente");
      }
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="mx-auto max-w-lg space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Mi Perfil</h1>
        <p className="text-muted-foreground mt-1 text-sm">Información de tu cuenta</p>
      </div>

      <div className="rounded-2xl border bg-white p-6 shadow-sm">
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-1">
            <Label htmlFor="email">Email</Label>
            <Input id="email" value={email} disabled className="bg-muted" />
          </div>

          <div className="space-y-1">
            <Label htmlFor="full_name">Nombre completo</Label>
            <Input
              id="full_name"
              name="full_name"
              defaultValue={profile.full_name}
              required
              minLength={2}
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1">
              <Label htmlFor="dni">DNI</Label>
              <Input id="dni" value={profile.dni} disabled className="bg-muted" />
            </div>
            {profile.legajo && (
              <div className="space-y-1">
                <Label htmlFor="legajo">Legajo</Label>
                <Input id="legajo" value={profile.legajo} disabled className="bg-muted" />
              </div>
            )}
          </div>

          <div className="space-y-1">
            <Label htmlFor="phone">Teléfono (opcional)</Label>
            <Input
              id="phone"
              name="phone"
              type="tel"
              defaultValue={profile.phone ?? ""}
              placeholder="Ej: 3814000000"
            />
          </div>

          <Button
            type="submit"
            className="w-full rounded-xl bg-[#E94A1F] text-white hover:bg-[#c73d18]"
            disabled={loading}
          >
            {loading ? "Guardando..." : "Guardar cambios"}
          </Button>
        </form>
      </div>
    </div>
  );
}
