import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { RegisterForm } from "./register-form";
import Link from "next/link";

export const metadata = { title: "Registrarse — Turnos UTN FRT" };

export default function RegisterPage() {
  return (
    <Card className="rounded-3xl border-0 shadow-lg">
      <CardHeader className="pb-2">
        <CardTitle className="text-2xl">Crear cuenta</CardTitle>
        <CardDescription>Registrate con tu email institucional para sacar turnos</CardDescription>
      </CardHeader>
      <CardContent>
        <RegisterForm />
        <p className="text-muted-foreground mt-4 text-center text-sm">
          ¿Ya tenés cuenta?{" "}
          <Link href="/login" className="font-medium text-[#E94A1F] hover:underline">
            Iniciá sesión
          </Link>
        </p>
      </CardContent>
    </Card>
  );
}
