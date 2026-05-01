"use client";

import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { logoutAction } from "@/app/(auth)/login/actions";
import type { Profile } from "@/types";
import { LogOut, User } from "lucide-react";
import Link from "next/link";
import { UtnBrand } from "@/components/brand/utn-brand";
import { NotificationsBell } from "@/components/layout/notifications-bell";

interface HeaderProps {
  profile: Profile;
}

export function Header({ profile }: HeaderProps) {
  const initials = profile.full_name
    .split(" ")
    .slice(0, 2)
    .map((n) => n[0])
    .join("")
    .toUpperCase();

  return (
    <header className="sticky top-0 z-20 flex h-16 items-center justify-between border-b bg-white/95 px-4 backdrop-blur lg:px-6">
      <UtnBrand size="md" className="lg:hidden" />
      <span className="hidden text-xl font-bold text-[#E94A1F] lg:block">
        Gestión de Turnos — Departamento de Alumnos
      </span>

      <div className="flex items-center gap-2">
        <NotificationsBell />
        <DropdownMenu>
          <DropdownMenuTrigger
            className="flex items-center gap-2 rounded-full focus:outline-none focus-visible:ring-2 focus-visible:ring-[#E94A1F]"
            aria-label="Menú de usuario"
          >
            <Avatar className="h-8 w-8 bg-[#E94A1F] text-white">
              <AvatarFallback className="bg-[#E94A1F] text-xs font-bold text-white">
                {initials}
              </AvatarFallback>
            </Avatar>
            <span className="hidden text-sm font-medium lg:block">{profile.full_name}</span>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-48">
            <DropdownMenuItem render={<Link href="/perfil" />}>
              <User className="h-4 w-4" />
              Mi perfil
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem variant="destructive" onClick={() => logoutAction()}>
              <LogOut className="h-4 w-4" />
              Cerrar sesión
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  );
}
