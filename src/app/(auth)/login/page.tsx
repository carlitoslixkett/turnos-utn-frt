import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { LoginForm } from "./login-form";
import Link from "next/link";

export const metadata = { title: "Iniciar sesión — Turnos UTN FRT" };

export default function LoginPage({ searchParams }: { searchParams: { error?: string } }) {
  return (
    <Card className="rounded-3xl border-0 shadow-lg">
      <CardHeader className="pb-2">
        <CardTitle className="text-2xl">Iniciar sesión</CardTitle>
        <CardDescription>Ingresá con tu email institucional UTN FRT</CardDescription>
      </CardHeader>
      <CardContent>
        {searchParams.error && (
          <div className="bg-destructive/10 text-destructive mb-4 rounded-xl px-4 py-3 text-sm">
            {searchParams.error === "auth_callback_failed"
              ? "Error al verificar el email. Intentá de nuevo."
              : "Ocurrió un error. Intentá de nuevo."}
          </div>
        )}
        <LoginForm />
        <p className="text-muted-foreground mt-4 text-center text-sm">
          ¿No tenés cuenta?{" "}
          <Link href="/register" className="font-medium text-[#E94A1F] hover:underline">
            Registrate
          </Link>
        </p>
      </CardContent>
    </Card>
  );
}
