import Link from "next/link";
import { createAdminClient, createClient } from "@/lib/supabase/server";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { parseWindows } from "@/lib/utils/interval-slots";
import {
  CalendarRange,
  ClipboardList,
  Clock,
  AlertTriangle,
  CheckCircle2,
  XCircle,
  ArrowRight,
  CalendarPlus,
  CalendarOff,
  LayoutDashboard,
  Users,
  BarChart3,
} from "lucide-react";
import { format } from "date-fns";
import { es } from "date-fns/locale";

export const metadata = { title: "Inicio — Turnos UTN FRT" };

const TZ = "America/Argentina/Buenos_Aires";

function todayInOfficeTz(): string {
  return new Date().toLocaleDateString("en-CA", { timeZone: TZ });
}

function dayBoundsIso(yyyymmdd: string): { startIso: string; endIso: string } {
  const [y, m, d] = yyyymmdd.split("-").map(Number);
  const noon = new Date(Date.UTC(y, m - 1, d, 12, 0, 0));
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: TZ,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).formatToParts(noon);
  const get = (t: string) => parts.find((p) => p.type === t)?.value ?? "0";
  const offsetMin = Math.round(
    (Date.UTC(
      Number(get("year")),
      Number(get("month")) - 1,
      Number(get("day")),
      Number(get("hour")),
      Number(get("minute"))
    ) -
      noon.getTime()) /
      60000
  );
  const startMs = Date.UTC(y, m - 1, d, 0, 0, 0) - offsetMin * 60000;
  const endMs = Date.UTC(y, m - 1, d, 23, 59, 59, 999) - offsetMin * 60000;
  return { startIso: new Date(startMs).toISOString(), endIso: new Date(endMs).toISOString() };
}

const WEEKDAYS = ["Lun", "Mar", "Mié", "Jue", "Vie", "Sáb", "Dom"];

export default async function WorkerDashboardPage() {
  const supabase = await createClient();
  const admin = await createAdminClient();

  const today = todayInOfficeTz();
  const { startIso, endIso } = dayBoundsIso(today);

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const [
    { data: profile },
    { data: settings },
    { count: pendingToday },
    { count: attendedToday },
    { count: lostToday },
    { data: nextTurn },
    { count: activeIntervals },
    { count: pendingFuture },
  ] = await Promise.all([
    supabase
      .from("profiles")
      .select("full_name")
      .eq("id", user?.id ?? "")
      .single(),
    admin
      .from("office_settings")
      .select("attention_windows, turn_duration_minutes")
      .eq("id", 1)
      .maybeSingle(),
    admin
      .from("turns")
      .select("id", { count: "exact", head: true })
      .eq("status", "pending")
      .gte("date", startIso)
      .lte("date", endIso),
    admin
      .from("turns")
      .select("id", { count: "exact", head: true })
      .eq("status", "attended")
      .gte("date", startIso)
      .lte("date", endIso),
    admin
      .from("turns")
      .select("id", { count: "exact", head: true })
      .eq("status", "lost")
      .gte("date", startIso)
      .lte("date", endIso),
    admin
      .from("turns")
      .select("date, note:notes(name), profile:profiles(full_name)")
      .eq("status", "pending")
      .gte("date", new Date().toISOString())
      .order("date", { ascending: true })
      .limit(1)
      .maybeSingle(),
    admin.from("intervals").select("id", { count: "exact", head: true }).eq("is_active", true),
    admin
      .from("turns")
      .select("id", { count: "exact", head: true })
      .eq("status", "pending")
      .gte("date", endIso),
  ]);

  // Closures for "today" and the next 30 days
  const in30 = new Date();
  in30.setDate(in30.getDate() + 30);
  const in30Ymd = in30.toLocaleDateString("en-CA", { timeZone: TZ });
  const { data: upcomingClosures } = await admin
    .from("office_closures")
    .select("id, date_start, date_end, all_day, start_time, end_time, reason")
    .gte("date_end", today)
    .lte("date_start", in30Ymd)
    .order("date_start", { ascending: true })
    .limit(5);
  const todaysClosure =
    (upcomingClosures ?? []).find((c) => today >= c.date_start && today <= c.date_end) ?? null;

  const firstName = profile?.full_name?.split(" ")[0] ?? "";
  const windows = parseWindows(settings?.attention_windows);
  const duration = settings?.turn_duration_minutes ?? 15;
  const hasWindows = windows.length > 0;

  // Group windows by (start, end) to display compactly
  const grouped = new Map<string, number[]>();
  for (const w of windows) {
    const key = `${w.start_time}-${w.end_time}`;
    const arr = grouped.get(key) ?? [];
    arr.push(w.weekday);
    grouped.set(key, arr);
  }
  const windowBlocks = Array.from(grouped.entries()).map(([range, days]) => ({
    range,
    days: days.sort((a, b) => a - b),
  }));

  return (
    <div className="space-y-8">
      <div className="flex flex-col items-start justify-between gap-3 sm:flex-row sm:items-center">
        <div>
          <h1 className="text-3xl font-bold">Hola{firstName ? `, ${firstName}` : ""}</h1>
          <p className="text-muted-foreground mt-1 text-sm">
            {format(new Date(`${today}T12:00:00`), "EEEE d 'de' MMMM yyyy", { locale: es })}
          </p>
        </div>
        <Button
          render={<Link href="/atender" />}
          nativeButton={false}
          size="lg"
          className="rounded-2xl bg-[#E94A1F] px-6 font-bold text-white hover:bg-[#c73d18]"
        >
          <ClipboardList className="mr-2 h-5 w-5" />
          Atender turnos
        </Button>
      </div>

      {!hasWindows && (
        <div className="flex items-start gap-3 rounded-xl border border-amber-200 bg-amber-50 p-4">
          <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-amber-600" />
          <div className="flex-1">
            <p className="font-medium text-amber-900">
              Todavía no configuraste los horarios de atención
            </p>
            <p className="text-sm text-amber-800">
              Sin esto, los estudiantes no van a poder sacar turnos.
            </p>
          </div>
          <Button
            render={<Link href="/horarios-atencion" />}
            nativeButton={false}
            size="sm"
            variant="outline"
          >
            Configurar
          </Button>
        </div>
      )}

      {todaysClosure && (
        <div className="flex items-start gap-3 rounded-xl border border-red-200 bg-red-50 p-4">
          <CalendarOff className="mt-0.5 h-5 w-5 shrink-0 text-red-600" />
          <div className="flex-1">
            <p className="font-medium text-red-900">
              {todaysClosure.all_day
                ? "Hoy la oficina no atiende"
                : `Cierre parcial hoy (${todaysClosure.start_time?.slice(0, 5)}–${todaysClosure.end_time?.slice(0, 5)})`}
            </p>
            <p className="text-sm text-red-800">
              <span className="font-medium">Motivo:</span> {todaysClosure.reason}
            </p>
          </div>
          <Button
            render={<Link href="/cierres" />}
            nativeButton={false}
            size="sm"
            variant="outline"
          >
            Ver
          </Button>
        </div>
      )}

      {/* Stats grid */}
      <section className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          icon={<Clock className="h-5 w-5 text-[#E94A1F]" />}
          label="Pendientes hoy"
          value={pendingToday ?? 0}
          href="/atender"
        />
        <StatCard
          icon={<CheckCircle2 className="h-5 w-5 text-green-600" />}
          label="Atendidos hoy"
          value={attendedToday ?? 0}
        />
        <StatCard
          icon={<XCircle className="h-5 w-5 text-red-600" />}
          label="Ausentes hoy"
          value={lostToday ?? 0}
        />
        <StatCard
          icon={<CalendarRange className="h-5 w-5 text-blue-600" />}
          label="Pendientes a futuro"
          value={pendingFuture ?? 0}
        />
      </section>

      {/* Two columns: next turn + horarios */}
      <section className="grid gap-4 lg:grid-cols-2">
        <Card className="rounded-2xl">
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Próximo turno</CardTitle>
          </CardHeader>
          <CardContent>
            {nextTurn ? (
              <div className="space-y-1">
                <p className="text-2xl font-bold">
                  {format(new Date(nextTurn.date as string), "HH:mm")}
                </p>
                <p className="text-muted-foreground text-xs">
                  {format(new Date(nextTurn.date as string), "EEEE d 'de' MMMM", { locale: es })}
                </p>
                <p className="text-sm font-medium">
                  {(nextTurn.note as { name: string } | null)?.name ?? "Trámite"}
                </p>
                <p className="text-muted-foreground text-xs">
                  {(nextTurn.profile as { full_name: string } | null)?.full_name}
                </p>
                <Button
                  render={<Link href="/atender" />}
                  nativeButton={false}
                  variant="outline"
                  size="sm"
                  className="mt-3"
                >
                  Ir a atender
                  <ArrowRight className="ml-1 h-4 w-4" />
                </Button>
              </div>
            ) : (
              <p className="text-muted-foreground text-sm">No hay turnos pendientes.</p>
            )}
          </CardContent>
        </Card>

        <Card className="rounded-2xl">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-base">Horarios de atención</CardTitle>
            <Link
              href="/horarios-atencion"
              className="text-xs font-medium text-[#E94A1F] hover:underline"
            >
              Editar
            </Link>
          </CardHeader>
          <CardContent>
            {windowBlocks.length === 0 ? (
              <p className="text-muted-foreground text-sm">Sin configurar.</p>
            ) : (
              <div className="space-y-2">
                {windowBlocks.map((b) => (
                  <div key={b.range} className="text-sm">
                    <span className="font-medium">{b.range.replace("-", " – ")}</span>
                    <span className="text-muted-foreground ml-2 text-xs">
                      {b.days.map((d) => WEEKDAYS[d - 1]).join(" ")}
                    </span>
                  </div>
                ))}
                <p className="text-muted-foreground border-t pt-2 text-xs">
                  Duración del turno: {duration} min
                </p>
              </div>
            )}
          </CardContent>
        </Card>
      </section>

      {/* Próximos cierres */}
      <section>
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-lg font-semibold">Próximos cierres / paros</h2>
          <Link href="/cierres" className="text-xs font-medium text-[#E94A1F] hover:underline">
            Gestionar
          </Link>
        </div>
        {!upcomingClosures || upcomingClosures.length === 0 ? (
          <Card className="rounded-2xl border-dashed">
            <CardContent className="text-muted-foreground py-6 text-center text-sm">
              No hay cierres programados.
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-2 sm:grid-cols-2">
            {upcomingClosures.map((c) => (
              <Card key={c.id} className="rounded-xl border-amber-200 bg-amber-50/40">
                <CardContent className="px-4 py-3">
                  <p className="text-sm font-medium capitalize">
                    {c.date_start === c.date_end
                      ? format(new Date(`${c.date_start}T12:00:00`), "EEEE d 'de' MMMM", {
                          locale: es,
                        })
                      : `${format(new Date(`${c.date_start}T12:00:00`), "d MMM", {
                          locale: es,
                        })} → ${format(new Date(`${c.date_end}T12:00:00`), "d MMM", {
                          locale: es,
                        })}`}
                    {!c.all_day && (
                      <span className="text-muted-foreground ml-2 text-xs">
                        {c.start_time?.slice(0, 5)}–{c.end_time?.slice(0, 5)}
                      </span>
                    )}
                  </p>
                  <p className="text-muted-foreground mt-0.5 truncate text-xs">{c.reason}</p>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </section>

      {/* Quick links */}
      <section>
        <h2 className="mb-3 text-lg font-semibold">Accesos rápidos</h2>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          <QuickLink
            href="/gestionar-intervalos"
            icon={<CalendarRange className="h-5 w-5" />}
            label="Intervalos"
            sub={`${activeIntervals ?? 0} activo${(activeIntervals ?? 0) === 1 ? "" : "s"}`}
          />
          <QuickLink
            href="/horarios-atencion"
            icon={<Clock className="h-5 w-5" />}
            label="Horarios de Atención"
            sub={hasWindows ? "Configurado" : "Sin configurar"}
          />
          <QuickLink
            href="/cierres"
            icon={<CalendarOff className="h-5 w-5" />}
            label="Cierres / Paros"
            sub={
              upcomingClosures && upcomingClosures.length > 0
                ? `${upcomingClosures.length} próximo${upcomingClosures.length === 1 ? "" : "s"}`
                : "Ninguno"
            }
          />
          <QuickLink
            href="/gestionar-notas"
            icon={<LayoutDashboard className="h-5 w-5" />}
            label="Notas (trámites)"
          />
          <QuickLink
            href="/noticias-admin"
            icon={<CalendarPlus className="h-5 w-5" />}
            label="Noticias"
          />
          <QuickLink
            href="/metricas"
            icon={<BarChart3 className="h-5 w-5" />}
            label="Métricas"
            sub="Solo admin"
          />
          <QuickLink
            href="/workers"
            icon={<Users className="h-5 w-5" />}
            label="Gestión Workers"
            sub="Solo admin"
          />
        </div>
      </section>
    </div>
  );
}

function StatCard({
  icon,
  label,
  value,
  href,
}: {
  icon: React.ReactNode;
  label: string;
  value: number;
  href?: string;
}) {
  const card = (
    <Card className="rounded-2xl transition-shadow hover:shadow-md">
      <CardContent className="flex items-center gap-3 px-4 py-4">
        <div className="bg-muted rounded-xl p-2">{icon}</div>
        <div>
          <p className="text-2xl font-bold">{value}</p>
          <p className="text-muted-foreground text-xs">{label}</p>
        </div>
      </CardContent>
    </Card>
  );
  return href ? <Link href={href}>{card}</Link> : card;
}

function QuickLink({
  href,
  icon,
  label,
  sub,
}: {
  href: string;
  icon: React.ReactNode;
  label: string;
  sub?: string;
}) {
  return (
    <Link
      href={href}
      className="flex items-center gap-3 rounded-xl border bg-white px-4 py-3 transition-colors hover:border-[#E94A1F]"
    >
      <div className="text-muted-foreground">{icon}</div>
      <div className="flex-1">
        <p className="text-sm font-medium">{label}</p>
        {sub && <p className="text-muted-foreground text-xs">{sub}</p>}
      </div>
      <ArrowRight className="text-muted-foreground h-4 w-4" />
    </Link>
  );
}
