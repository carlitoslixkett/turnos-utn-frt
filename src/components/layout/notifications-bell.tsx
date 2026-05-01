"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Bell, Check, CheckCheck } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { es } from "date-fns/locale";

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import { createClient } from "@/lib/supabase/client";

interface NotificationItem {
  id: string;
  type: string;
  title: string;
  body: string;
  link: string | null;
  read_at: string | null;
  created_at: string;
}

const POLL_MS = 60_000; // also subscribe via realtime, this is a safety net

export function NotificationsBell() {
  const router = useRouter();
  const [items, setItems] = useState<NotificationItem[]>([]);
  const [unread, setUnread] = useState(0);
  const [open, setOpen] = useState(false);
  const supabase = createClient();

  const fetchAll = useCallback(async () => {
    try {
      const res = await fetch("/api/notifications", { cache: "no-store" });
      if (!res.ok) return;
      const json = await res.json();
      setItems(json.data ?? []);
      setUnread(json.unread_count ?? 0);
    } catch {
      /* noop */
    }
  }, []);

  // Initial load + realtime + interval
  useEffect(() => {
    // Defer the first fetch so we don't call setState synchronously during the effect body
    const initialTimer = setTimeout(fetchAll, 0);
    const interval = setInterval(fetchAll, POLL_MS);

    let channel: ReturnType<typeof supabase.channel> | null = null;
    (async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) return;
      channel = supabase
        .channel(`notifications-${user.id}`)
        .on(
          "postgres_changes",
          {
            event: "INSERT",
            schema: "public",
            table: "notifications",
            filter: `user_id=eq.${user.id}`,
          },
          () => fetchAll()
        )
        .subscribe();
    })();

    return () => {
      clearTimeout(initialTimer);
      clearInterval(interval);
      if (channel) supabase.removeChannel(channel);
    };
  }, [fetchAll, supabase]);

  async function markAllRead() {
    await fetch("/api/notifications", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ all: true }),
    });
    fetchAll();
    router.refresh();
  }

  async function markOneRead(id: string) {
    await fetch("/api/notifications", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ids: [id] }),
    });
    fetchAll();
  }

  return (
    <DropdownMenu open={open} onOpenChange={setOpen}>
      <DropdownMenuTrigger
        className="hover:bg-muted relative flex h-9 w-9 items-center justify-center rounded-full focus:outline-none focus-visible:ring-2 focus-visible:ring-[#E94A1F]"
        aria-label="Notificaciones"
      >
        <Bell className="h-5 w-5" />
        {unread > 0 && (
          <span className="absolute -top-0.5 -right-0.5 flex h-5 min-w-5 items-center justify-center rounded-full bg-[#E94A1F] px-1 text-[10px] font-bold text-white">
            {unread > 9 ? "9+" : unread}
          </span>
        )}
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-[340px] p-0">
        <div className="flex items-center justify-between border-b px-3 py-2">
          <p className="text-sm font-semibold">Notificaciones</p>
          {unread > 0 && (
            <Button
              type="button"
              size="sm"
              variant="ghost"
              onClick={markAllRead}
              className="h-7 px-2 text-xs"
            >
              <CheckCheck className="mr-1 h-3.5 w-3.5" />
              Marcar todas
            </Button>
          )}
        </div>

        {items.length === 0 ? (
          <div className="text-muted-foreground flex flex-col items-center gap-2 py-8 text-center text-xs">
            <Bell className="h-6 w-6 opacity-40" />
            No tenés notificaciones.
          </div>
        ) : (
          <div className="max-h-[420px] overflow-y-auto">
            {items.map((n) => {
              const unreadItem = !n.read_at;
              const Inner = (
                <div
                  className={`group flex flex-col gap-1 border-b px-3 py-2.5 text-sm last:border-b-0 ${
                    unreadItem ? "bg-amber-50/60" : ""
                  } hover:bg-muted/50`}
                >
                  <div className="flex items-start justify-between gap-2">
                    <p className="leading-snug font-medium">{n.title}</p>
                    {unreadItem && (
                      <span className="mt-1 h-2 w-2 shrink-0 rounded-full bg-[#E94A1F]" />
                    )}
                  </div>
                  <p className="text-muted-foreground text-xs leading-relaxed">{n.body}</p>
                  <div className="mt-1 flex items-center justify-between">
                    <span className="text-muted-foreground text-[10px]">
                      {formatDistanceToNow(new Date(n.created_at), {
                        locale: es,
                        addSuffix: true,
                      })}
                    </span>
                    {unreadItem && (
                      <button
                        type="button"
                        onClick={(e) => {
                          e.preventDefault();
                          e.stopPropagation();
                          markOneRead(n.id);
                        }}
                        className="text-muted-foreground hover:text-foreground text-[10px]"
                      >
                        <Check className="inline h-3 w-3" /> marcar leída
                      </button>
                    )}
                  </div>
                </div>
              );

              if (n.link) {
                return (
                  <Link
                    key={n.id}
                    href={n.link}
                    onClick={() => {
                      setOpen(false);
                      if (unreadItem) markOneRead(n.id);
                    }}
                    className="block"
                  >
                    {Inner}
                  </Link>
                );
              }
              return <div key={n.id}>{Inner}</div>;
            })}
          </div>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
