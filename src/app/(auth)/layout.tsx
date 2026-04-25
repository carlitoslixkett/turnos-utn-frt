import { UtnBrand } from "@/components/brand/utn-brand";

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-[#E94A1F]/10 via-white to-orange-50 p-4">
      <div className="w-full max-w-md">
        <div className="mb-8 text-center">
          <h1 className="flex justify-center">
            <UtnBrand size="lg" />
          </h1>
          <p className="text-muted-foreground mt-1 text-sm">Sistema de Gestión de Turnos</p>
          <p className="text-muted-foreground text-xs">Departamento de Alumnos</p>
        </div>
        {children}
      </div>
    </div>
  );
}
