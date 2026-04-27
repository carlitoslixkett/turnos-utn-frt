"use client";

import { useActionState } from "react";
import { resendVerificationAction } from "./actions";
import { Button } from "@/components/ui/button";
import { Loader2 } from "lucide-react";

type State = { ok?: boolean; error?: string };
const initial: State = {};

export function ResendForm({ email }: { email: string }) {
  const [state, action, isPending] = useActionState(
    async (_: State, fd: FormData) => (await resendVerificationAction(fd)) ?? initial,
    initial
  );

  return (
    <form action={action} className="flex flex-col items-center gap-2">
      <input type="hidden" name="email" value={email} />
      <Button type="submit" variant="outline" size="sm" disabled={isPending || state.ok}>
        {isPending ? (
          <>
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            Reenviando...
          </>
        ) : state.ok ? (
          "Email reenviado ✓"
        ) : (
          "Reenviar email de verificación"
        )}
      </Button>
      {state.error && (
        <p role="alert" className="text-destructive text-xs">
          {state.error}
        </p>
      )}
    </form>
  );
}
