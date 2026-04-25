"use client";

import { useMemo, useState } from "react";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { FileSearch } from "lucide-react";

interface AuditLogRow {
  id: string;
  actor_id: string | null;
  action: string;
  entity_type: string;
  entity_id: string | null;
  payload: unknown;
  ip_address: string | null;
  user_agent: string | null;
  created_at: string;
  actor?: { full_name: string } | null;
}

const ACTION_COLORS: Record<string, string> = {
  "user.login": "bg-blue-100 text-blue-800",
  "user.logout": "bg-gray-100 text-gray-700",
  "turn.create": "bg-green-100 text-green-800",
  "turn.cancel": "bg-orange-100 text-orange-800",
  "turn.attend": "bg-emerald-100 text-emerald-800",
  "turn.lost": "bg-red-100 text-red-800",
  "turn.cancel_attempt_failed": "bg-yellow-100 text-yellow-800",
  "turn.cancel_by_interval_deactivation": "bg-rose-100 text-rose-800",
  "interval.update": "bg-indigo-100 text-indigo-800",
  "note.create": "bg-purple-100 text-purple-800",
  "note.update": "bg-purple-100 text-purple-800",
  "news.create": "bg-pink-100 text-pink-800",
  "worker.grant_admin": "bg-sky-100 text-sky-800",
  "worker.revoke_admin": "bg-sky-100 text-sky-800",
  "worker.delete": "bg-red-100 text-red-800",
};

export function AuditLogClient({ initialLogs }: { initialLogs: AuditLogRow[] }) {
  const [search, setSearch] = useState("");
  const [actionFilter, setActionFilter] = useState("");

  const filtered = useMemo(() => {
    const s = search.trim().toLowerCase();
    const a = actionFilter.trim().toLowerCase();
    return initialLogs.filter((l) => {
      const matchSearch =
        !s ||
        l.actor?.full_name?.toLowerCase().includes(s) ||
        l.entity_type.toLowerCase().includes(s) ||
        (l.entity_id ?? "").toLowerCase().includes(s);
      const matchAction = !a || l.action.toLowerCase().includes(a);
      return matchSearch && matchAction;
    });
  }, [initialLogs, search, actionFilter]);

  const uniqueActions = useMemo(
    () => Array.from(new Set(initialLogs.map((l) => l.action))).sort(),
    [initialLogs]
  );

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Audit Log</h1>
        <p className="text-muted-foreground mt-1 text-sm">
          Últimas 200 acciones registradas en el sistema
        </p>
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        <Input
          placeholder="Buscar por actor, entidad o ID..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
        <select
          className="border-input h-10 rounded-xl border bg-white px-3 text-sm"
          value={actionFilter}
          onChange={(e) => setActionFilter(e.target.value)}
        >
          <option value="">Todas las acciones</option>
          {uniqueActions.map((a) => (
            <option key={a} value={a}>
              {a}
            </option>
          ))}
        </select>
      </div>

      <div className="rounded-xl border bg-white">
        {filtered.length === 0 ? (
          <div className="text-muted-foreground flex flex-col items-center gap-2 py-12 text-sm">
            <FileSearch className="h-8 w-8 opacity-30" />
            Sin resultados
          </div>
        ) : (
          <ul className="divide-y">
            {filtered.map((log) => (
              <li
                key={log.id}
                className="flex flex-col gap-1 px-4 py-3 sm:flex-row sm:items-center sm:justify-between"
              >
                <div className="flex items-center gap-3">
                  <Badge
                    className={`${ACTION_COLORS[log.action] ?? "bg-gray-100 text-gray-700"} font-mono text-xs`}
                  >
                    {log.action}
                  </Badge>
                  <div>
                    <p className="text-sm font-medium">
                      {log.actor?.full_name ?? (
                        <span className="text-muted-foreground">Sistema</span>
                      )}
                    </p>
                    <p className="text-muted-foreground text-xs">
                      {log.entity_type}
                      {log.entity_id && (
                        <>
                          {" · "}
                          <span className="font-mono">#{log.entity_id.slice(0, 8)}</span>
                        </>
                      )}
                    </p>
                  </div>
                </div>
                <span className="text-muted-foreground shrink-0 text-xs">
                  {format(new Date(log.created_at), "d MMM yyyy HH:mm:ss", { locale: es })}
                </span>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
