import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { MailCheck } from "lucide-react";
import Link from "next/link";

export const metadata = { title: "Verificá tu email — Turnos UTN FRT" };

export default function VerifyPage({ searchParams }: { searchParams: { email?: string } }) {
  return (
    <Card className="rounded-3xl border-0 text-center shadow-lg">
      <CardHeader className="flex flex-col items-center pb-2">
        <div className="mb-2 rounded-full bg-[#E94A1F]/10 p-4">
          <MailCheck className="h-10 w-10 text-[#E94A1F]" />
        </div>
        <CardTitle className="text-2xl">¡Verificá tu email!</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <p className="text-muted-foreground">
          Te enviamos un link de verificación a{" "}
          <span className="text-foreground font-semibold">{searchParams.email ?? "tu email"}</span>.
        </p>
        <p className="text-muted-foreground text-sm">
          Hacé clic en el link del email para activar tu cuenta. Si no lo ves, revisá la carpeta de
          spam.
        </p>
        <p className="text-sm">
          <Link href="/login" className="font-medium text-[#E94A1F] hover:underline">
            Volver al inicio de sesión
          </Link>
        </p>
      </CardContent>
    </Card>
  );
}
