"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import {
  Home,
  CalendarPlus,
  CalendarDays,
  Newspaper,
  LayoutDashboard,
  BarChart3,
  Users,
  ClipboardList,
  CalendarRange,
  FileSearch,
  Menu,
  X,
  Clock,
} from "lucide-react";
import { cn } from "@/lib/utils";
import type { Profile } from "@/types";
import { UtnBrand } from "@/components/brand/utn-brand";

interface NavItem {
  href: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  roles?: ("student" | "worker" | "admin")[];
}

const navItems: NavItem[] = [
  { href: "/home", label: "Home", icon: Home },
  { href: "/sacar-turno", label: "Sacar Turno", icon: CalendarPlus, roles: ["student"] },
  { href: "/mis-turnos", label: "Mis Turnos", icon: CalendarDays, roles: ["student"] },
  { href: "/noticias", label: "Noticias", icon: Newspaper },
  { href: "/atender", label: "Atender Turnos", icon: ClipboardList, roles: ["worker"] },
  { href: "/gestionar-notas", label: "Notas", icon: LayoutDashboard, roles: ["worker"] },
  { href: "/gestionar-intervalos", label: "Intervalos", icon: CalendarRange, roles: ["worker"] },
  { href: "/horarios-atencion", label: "Horarios de Atención", icon: Clock, roles: ["worker"] },
  { href: "/noticias-admin", label: "Noticias (Admin)", icon: Newspaper, roles: ["worker"] },
  { href: "/workers", label: "Gestión Workers", icon: Users, roles: ["admin"] },
  { href: "/metricas", label: "Métricas", icon: BarChart3, roles: ["admin"] },
  { href: "/audit-log", label: "Audit Log", icon: FileSearch, roles: ["admin"] },
];

interface SidebarProps {
  profile: Profile;
  isAdmin?: boolean;
}

export function Sidebar({ profile, isAdmin }: SidebarProps) {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);

  const userRoles: ("student" | "worker" | "admin")[] = [profile.user_type];
  if (isAdmin) userRoles.push("admin");

  const filtered = navItems.filter(
    (item) => !item.roles || item.roles.some((r) => userRoles.includes(r))
  );

  return (
    <>
      {/* Mobile overlay */}
      {open && (
        <div className="fixed inset-0 z-30 bg-black/50 lg:hidden" onClick={() => setOpen(false)} />
      )}

      {/* Sidebar */}
      <aside
        className={cn(
          "fixed inset-y-0 left-0 z-40 flex w-64 flex-col bg-white shadow-lg transition-transform duration-300 lg:static lg:translate-x-0",
          open ? "translate-x-0" : "-translate-x-full"
        )}
      >
        {/* Header */}
        <div className="flex h-16 items-center justify-between border-b px-4">
          <UtnBrand size="sm" />
          <button
            className="hover:bg-muted rounded-md p-1 lg:hidden"
            onClick={() => setOpen(false)}
            aria-label="Cerrar menú"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Nav */}
        <nav className="flex-1 overflow-y-auto px-2 py-4" aria-label="Menú principal">
          {filtered.map((item) => {
            const active = pathname === item.href || pathname.startsWith(item.href + "/");
            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={() => setOpen(false)}
                className={cn(
                  "mb-1 flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-colors",
                  active
                    ? "bg-[#E94A1F] text-white"
                    : "text-foreground hover:bg-muted hover:text-[#E94A1F]"
                )}
                aria-current={active ? "page" : undefined}
              >
                <item.icon className="h-5 w-5 shrink-0" />
                {item.label}
              </Link>
            );
          })}
        </nav>
      </aside>

      {/* Mobile toggle button (passed to Header via context or rendered inline) */}
      <button
        className="fixed bottom-4 left-4 z-50 rounded-full bg-[#E94A1F] p-3 text-white shadow-lg lg:hidden"
        onClick={() => setOpen(true)}
        aria-label="Abrir menú"
      >
        <Menu className="h-5 w-5" />
      </button>
    </>
  );
}
