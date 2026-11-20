"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import {
  readMemberSession,
  writeMemberSession,
  type MemberSession,
} from "@/lib/current-member";
import { writeSelectedProjectId } from "@/lib/selected-project";
import { ROLE_LABELS } from "@/lib/roles";
import type { AppNotification } from "@/lib/types";
import { cn, formatDateTime } from "@/lib/utils";
import { Bell, ChevronDown, LogIn, LogOut } from "lucide-react";

function memberInitials(nickname: string) {
  const parts = nickname.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "?";
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return `${parts[0][0] ?? ""}${parts[1][0] ?? ""}`.toUpperCase();
}

function useSessionNotifications() {
  const router = useRouter();
  const pathname = usePathname();
  const [session, setSession] = useState<MemberSession | null>(null);
  const [notifyOpen, setNotifyOpen] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [items, setItems] = useState<AppNotification[]>([]);

  useEffect(() => {
    const refresh = () => setSession(readMemberSession());
    refresh();
    window.addEventListener("fwf-current-member-changed", refresh);
    return () =>
      window.removeEventListener("fwf-current-member-changed", refresh);
  }, []);

  const load = useCallback(async () => {
    if (!session?.id) {
      setItems([]);
      return;
    }
    const response = await fetch(
      `/api/notifications?teamMemberId=${encodeURIComponent(session.id)}`,
    );
    if (!response.ok) {
      setItems([]);
      return;
    }
    setItems((await response.json()) as AppNotification[]);
  }, [session?.id]);

  useEffect(() => {
    void load();
    if (!session?.id) return;
    const timer = window.setInterval(() => {
      void load();
    }, 30000);
    return () => window.clearInterval(timer);
  }, [load, session?.id]);

  const unread = items.filter((item) => !item.readAt).length;

  function handleLogout() {
    writeMemberSession(null);
    writeSelectedProjectId(null);
    setNotifyOpen(false);
    setMenuOpen(false);
    router.push("/login");
  }

  async function markAllRead() {
    if (!session?.id) return;
    await fetch("/api/notifications", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ teamMemberId: session.id, markAllRead: true }),
    });
    await load();
  }

  async function markOne(id: string) {
    await fetch(`/api/notifications/${id}`, { method: "PATCH" });
    await load();
  }

  return {
    session,
    pathname,
    notifyOpen,
    setNotifyOpen,
    menuOpen,
    setMenuOpen,
    items,
    unread,
    handleLogout,
    markAllRead,
    markOne,
  };
}

function NotificationPanel({
  open,
  items,
  unread,
  onMarkAll,
  onMarkOne,
  align = "right",
  side = "top",
}: {
  open: boolean;
  items: AppNotification[];
  unread: number;
  onMarkAll: () => void;
  onMarkOne: (id: string) => void;
  align?: "left" | "right";
  side?: "top" | "bottom";
}) {
  if (!open) return null;

  return (
    <div
      className={cn(
        "absolute z-50 w-[min(20rem,calc(100vw-1.5rem))] rounded-xl border border-slate-200 bg-white p-2 shadow-lg",
        align === "right" ? "right-0" : "left-0",
        side === "bottom"
          ? "top-full mt-2"
          : "bottom-full mb-2",
      )}
    >
      <div className="mb-2 flex items-center justify-between px-1">
        <p className="text-xs font-semibold text-slate-700">การแจ้งเตือน</p>
        <button
          type="button"
          className="text-xs text-primary hover:underline disabled:text-slate-400"
          disabled={unread === 0}
          onClick={onMarkAll}
        >
          อ่านทั้งหมด
        </button>
      </div>
      {items.length === 0 ? (
        <p className="px-2 py-4 text-center text-xs text-slate-500">
          ยังไม่มีการแจ้งเตือน
        </p>
      ) : (
        <ul className="max-h-72 space-y-1 overflow-y-auto">
          {items.map((item) => (
            <li key={item.id}>
              <button
                type="button"
                className={cn(
                  "w-full rounded-lg px-2 py-2 text-left transition hover:bg-slate-50",
                  !item.readAt && "bg-sky-50/70",
                )}
                onClick={() => onMarkOne(item.id)}
              >
                <p className="text-xs font-medium text-slate-800">
                  {item.title}
                </p>
                {item.body ? (
                  <p className="mt-0.5 line-clamp-2 text-[11px] text-slate-500">
                    {item.body}
                  </p>
                ) : null}
                <p className="mt-1 text-[10px] text-slate-400">
                  {formatDateTime(item.createdAt)}
                </p>
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

export function SidebarProfile({
  placement = "topbar",
}: {
  placement?: "topbar" | "sidebar";
}) {
  const {
    session,
    pathname,
    notifyOpen,
    setNotifyOpen,
    menuOpen,
    setMenuOpen,
    items,
    unread,
    handleLogout,
    markAllRead,
    markOne,
  } = useSessionNotifications();
  const isTopbar = placement === "topbar";

  if (!session) {
    const next = encodeURIComponent(pathname || "/dashboard");
    return (
      <Link
        href={`/signin?next=${next}`}
        className="inline-flex h-10 items-center gap-2 rounded-full bg-white px-3.5 text-sm font-medium text-slate-600 shadow-sm ring-1 ring-slate-200/70 transition hover:bg-slate-50 hover:text-slate-900"
        title="เข้าสู่ระบบ"
      >
        <LogIn className="h-4 w-4" />
        <span>เข้าสู่ระบบ</span>
      </Link>
    );
  }

  return (
    <div
      className={cn(
        "relative",
        isTopbar ? "flex shrink-0 items-center gap-2" : undefined,
      )}
    >
      {isTopbar ? (
        <button
          type="button"
          onClick={() => {
            setNotifyOpen((open) => !open);
            setMenuOpen(false);
          }}
          className="relative flex h-11 w-11 items-center justify-center rounded-full bg-white/90 text-slate-500 shadow-[0_8px_24px_rgba(15,23,42,0.08)] ring-1 ring-white/80 backdrop-blur-md transition hover:bg-white hover:text-slate-800"
          aria-label="การแจ้งเตือน"
          aria-expanded={notifyOpen}
          title="การแจ้งเตือน"
        >
          <Bell className="h-4 w-4" />
          {unread > 0 ? (
            <span className="absolute top-1.5 right-1.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-red-500 px-1 text-[10px] font-semibold text-white ring-2 ring-white">
              {unread > 9 ? "9+" : unread}
            </span>
          ) : null}
        </button>
      ) : null}

      <button
        type="button"
        onClick={() => {
          setMenuOpen((open) => !open);
          setNotifyOpen(false);
        }}
        className={cn(
          "flex items-center text-left transition",
          isTopbar
            ? "h-11 max-w-[15rem] gap-3 rounded-full bg-white/90 py-1.5 pl-2 pr-3 shadow-[0_8px_24px_rgba(15,23,42,0.08)] ring-1 ring-white/80 backdrop-blur-md hover:bg-white"
            : "w-full gap-2.5 rounded-full bg-white px-2 py-1.5 shadow-sm ring-1 ring-slate-200/70 hover:bg-slate-50",
        )}
        aria-expanded={menuOpen}
        aria-label="โปรไฟล์"
      >
        <span
          className={cn(
            "relative flex shrink-0 items-center justify-center rounded-full font-semibold text-white",
            isTopbar ? "h-8 w-8 text-xs" : "h-7 w-7 text-[11px]",
          )}
          style={{ backgroundColor: session.color || "#6BB82A" }}
        >
          {memberInitials(session.nickname)}
          {!isTopbar && unread > 0 ? (
            <span className="absolute -top-0.5 -right-0.5 h-2 w-2 rounded-full bg-sky-500 ring-2 ring-white" />
          ) : null}
        </span>
        <span className="min-w-0 flex-1 py-0.5">
          <span className="block truncate text-sm font-semibold leading-tight text-slate-900">
            {session.nickname}
          </span>
          <span className="mt-0.5 block truncate text-[11px] leading-tight text-slate-500">
            {ROLE_LABELS[session.role]}
            {session.employeeId ? ` · ${session.employeeId}` : ""}
          </span>
        </span>
        <ChevronDown
          className={cn(
            "h-4 w-4 shrink-0 text-slate-400 transition",
            menuOpen && "rotate-180",
          )}
        />
      </button>

      {menuOpen ? (
        <div
          className={cn(
            "absolute z-50 w-52 rounded-2xl border border-slate-200 bg-white p-1.5 shadow-lg",
            isTopbar ? "top-full right-0 mt-2" : "bottom-full left-0 mb-2",
          )}
        >
          {!isTopbar ? (
            <button
              type="button"
              className="flex w-full items-center gap-2 rounded-xl px-2.5 py-2 text-left text-sm text-slate-600 transition hover:bg-slate-50 hover:text-slate-900"
              onClick={() => setNotifyOpen((open) => !open)}
            >
              <Bell className="h-4 w-4" />
              การแจ้งเตือน
              {unread > 0 ? (
                <span className="ml-auto rounded-md bg-slate-100 px-1.5 text-[11px] font-semibold text-slate-700">
                  {unread > 9 ? "9+" : unread}
                </span>
              ) : null}
            </button>
          ) : null}
          <button
            type="button"
            className="flex w-full items-center gap-2 rounded-xl px-2.5 py-2 text-left text-sm text-slate-600 transition hover:bg-slate-50 hover:text-slate-900"
            onClick={handleLogout}
          >
            <LogOut className="h-4 w-4" />
            ออกจากระบบ
          </button>
        </div>
      ) : null}

      <NotificationPanel
        open={notifyOpen}
        items={items}
        unread={unread}
        onMarkAll={() => void markAllRead()}
        onMarkOne={(id) => void markOne(id)}
        align="right"
        side={isTopbar ? "bottom" : "top"}
      />
    </div>
  );
}

export function SessionControls() {
  const {
    session,
    pathname,
    notifyOpen,
    setNotifyOpen,
    items,
    unread,
    handleLogout,
    markAllRead,
    markOne,
  } = useSessionNotifications();

  if (!session) {
    const next = encodeURIComponent(pathname || "/dashboard");
    return (
      <Button
        type="button"
        variant="ghost"
        className="h-9 rounded-lg px-2.5 text-sm text-slate-600"
        asChild
      >
        <Link href={`/signin?next=${next}`}>
          <LogIn className="h-4 w-4" />
          <span className="hidden sm:inline">เข้าสู่ระบบ</span>
        </Link>
      </Button>
    );
  }

  return (
    <div className="relative flex h-9 w-full items-center rounded-xl border border-slate-200/80 bg-white/90 pl-1.5 pr-0.5">
      <div
        className="flex min-w-0 items-center gap-1.5 pr-1"
        title={`${session.nickname} · ${ROLE_LABELS[session.role]}${session.employeeId ? ` · ${session.employeeId}` : ""}`}
      >
        <span
          className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-[10px] font-semibold text-white"
          style={{ backgroundColor: session.color || "#6BB82A" }}
        >
          {memberInitials(session.nickname)}
        </span>
        <span className="hidden min-w-0 sm:block">
          <span className="block max-w-[5.5rem] truncate text-xs font-medium text-slate-700">
            {session.nickname}
          </span>
          <span className="block text-[10px] leading-none text-slate-400">
            {ROLE_LABELS[session.role]}
          </span>
        </span>
      </div>

      <span className="mx-0.5 h-4 w-px shrink-0 bg-slate-200" aria-hidden />

      <Button
        type="button"
        variant="ghost"
        size="sm"
        className="relative h-8 w-8 shrink-0 px-0 text-slate-500 hover:text-slate-700"
        onClick={() => setNotifyOpen((current) => !current)}
        aria-label="การแจ้งเตือน"
        title="การแจ้งเตือน"
      >
        <Bell className="h-4 w-4" />
        {unread > 0 ? (
          <span className="absolute top-0.5 right-0.5 flex h-3.5 min-w-3.5 items-center justify-center rounded-full bg-red-500 px-0.5 text-[9px] font-semibold text-white">
            {unread > 9 ? "9+" : unread}
          </span>
        ) : null}
      </Button>

      <Button
        type="button"
        variant="ghost"
        size="sm"
        className="h-8 w-8 shrink-0 px-0 text-slate-400 hover:text-slate-700"
        onClick={handleLogout}
        title="ออกจากระบบ"
        aria-label="ออกจากระบบ"
      >
        <LogOut className="h-3.5 w-3.5" />
      </Button>

      {notifyOpen ? (
        <div className="absolute top-full right-0 z-50 mt-1.5 w-[min(20rem,calc(100vw-1.5rem))] rounded-xl border border-slate-200 bg-white p-2 shadow-lg">
          <div className="mb-2 flex items-center justify-between px-1">
            <p className="text-xs font-semibold text-slate-700">การแจ้งเตือน</p>
            <button
              type="button"
              className="text-xs text-primary hover:underline disabled:text-slate-400"
              disabled={unread === 0}
              onClick={() => void markAllRead()}
            >
              อ่านทั้งหมด
            </button>
          </div>
          {items.length === 0 ? (
            <p className="px-2 py-4 text-center text-xs text-slate-500">
              ยังไม่มีการแจ้งเตือน
            </p>
          ) : (
            <ul className="max-h-72 space-y-1 overflow-y-auto">
              {items.map((item) => (
                <li key={item.id}>
                  <button
                    type="button"
                    className={cn(
                      "w-full rounded-lg px-2 py-2 text-left transition hover:bg-slate-50",
                      !item.readAt && "bg-sky-50/70",
                    )}
                    onClick={() => void markOne(item.id)}
                  >
                    <p className="text-xs font-medium text-slate-800">
                      {item.title}
                    </p>
                    {item.body ? (
                      <p className="mt-0.5 line-clamp-2 text-[11px] text-slate-500">
                        {item.body}
                      </p>
                    ) : null}
                    <p className="mt-1 text-[10px] text-slate-400">
                      {formatDateTime(item.createdAt)}
                    </p>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      ) : null}
    </div>
  );
}
