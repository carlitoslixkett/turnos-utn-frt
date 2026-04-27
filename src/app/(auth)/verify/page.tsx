import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { MailCheck, AlertCircle } from "lucide-react";
import Link from "next/link";
import { ResendForm } from "./resend-form";

export const metadata = { title: "Verificá tu email — Turnos UTN FRT" };

export default async function VerifyPage({
  searchParams,
}: {
  searchParams: Promise<{ email?: string; unconfirmed?: string }>;
}) {
  const { email, unconfirmed } = await searchParams;
  const fromLogin = unconfirmed === "1";

  return (
    <Card className="rounded-3xl border-0 text-center shadow-lg">
      <CardHeader className="flex flex-col items-center pb-2">
        <div
          className={`mb-2 rounded-full p-4 ${fromLogin ? "bg-amber-500/10" : "bg-[#E94A1F]/10"}`}
        >
          {fromLogin ? (
            <AlertCircle className="h-10 w-10 text-amber-600" />
          ) : (
            <MailCheck className="h-10 w-10 text-[#E94A1F]" />
          )}
        </div>
        <CardTitle className="text-2xl">
          {fromLogin ? "Tenés que verificar tu email" : "¡Verificá tu email!"}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <p className="text-muted-foreground">
          {fromLogin
            ? "Tu cuenta existe pero todavía no confirmaste el email. Te enviamos un link a "
            : "Te enviamos un link de verificación a "}
          <span className="text-foreground font-semibold">{email ?? "tu email"}</span>.
        </p>
        <p className="text-muted-foreground text-sm">
          Hacé clic en el link del email para activar tu cuenta. Si no lo ves, revisá la carpeta de
          spam.
        </p>
        {email && <ResendForm email={email} />}
        <p className="text-sm">
          <Link href="/login" className="font-medium text-[#E94A1F] hover:underline">
            Volver al inicio de sesión
          </Link>
        </p>
      </CardContent>
    </Card>
  );
}
