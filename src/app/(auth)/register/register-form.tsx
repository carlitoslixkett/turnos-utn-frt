"use client";

import { useActionState } from "react";
import { registerAction } from "./actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Loader2 } from "lucide-react";

const initialState = { error: undefined as string | undefined };

export function RegisterForm() {
  const [state, formAction, isPending] = useActionState(
    async (_: typeof initialState, formData: FormData) => {
      const result = await registerAction(formData);
      return result ?? initialState;
    },
    initialState
  );

  return (
    <form action={formAction} className="space-y-4">
      <div className="space-y-1.5">
        <Label htmlFor="full_name">Nombre completo</Label>
        <Input
          id="full_name"
          name="full_name"
          type="text"
          autoComplete="name"
          placeholder="Juan Pérez"
          required
          disabled={isPending}
        />
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1.5">
          <Label htmlFor="dni">DNI</Label>
          <Input
            id="dni"
            name="dni"
            type="text"
            inputMode="numeric"
            placeholder="12345678"
            required
            disabled={isPending}
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="legajo">
            Legajo <span className="text-muted-foreground text-xs">(opcional)</span>
          </Label>
          <Input id="legajo" name="legajo" type="text" placeholder="12345" disabled={isPending} />
        </div>
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="email">Email institucional</Label>
        <Input
          id="email"
          name="email"
          type="email"
          autoComplete="email"
          placeholder="tu.nombre@frt.utn.edu.ar"
          required
          disabled={isPending}
        />
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="phone">
          Teléfono <span className="text-muted-foreground text-xs">(opcional)</span>
        </Label>
        <Input
          id="phone"
          name="phone"
          type="tel"
          autoComplete="tel"
          placeholder="+54 381 000 0000"
          disabled={isPending}
        />
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="password">Contraseña</Label>
        <Input
          id="password"
          name="password"
          type="password"
          autoComplete="new-password"
          placeholder="Mínimo 8 caracteres, 1 mayúscula, 1 número"
          required
          disabled={isPending}
        />
      </div>

      {state?.error && (
        <p role="alert" className="text-destructive text-sm">
          {state.error}
        </p>
      )}

      <Button
        type="submit"
        className="w-full bg-[#E94A1F] font-semibold text-white hover:bg-[#c73d18]"
        disabled={isPending}
      >
        {isPending ? (
          <>
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            Creando cuenta...
          </>
        ) : (
          "Crear cuenta"
        )}
      </Button>

      <p className="text-muted-foreground text-center text-xs">
        Solo se aceptan emails @frt.utn.edu.ar
      </p>
    </form>
  );
}
