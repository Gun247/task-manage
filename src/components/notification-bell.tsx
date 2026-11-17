"use client";

import { useCallback, useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { readCurrentMemberId } from "@/lib/current-member";
import type { AppNotification } from "@/lib/types";
import { cn, formatDateTime } from "@/lib/utils";
import { Bell } from "lucide-react";

export function NotificationBell() {
  const [memberId, setMemberId] = useState("");
  const [open, setOpen] = useState(false);
  const [items, setItems] = useState<AppNotification[]>([]);

  useEffect(() => {
    setMemberId(readCurrentMemberId());
    const onChange = () => setMemberId(readCurrentMemberId());
    window.addEventListener("fwf-current-member-changed", onChange);
    return () =>
      window.removeEventListener("fwf-current-member-changed", onChange);
  }, []);

  const load = useCallback(async () => {
    if (!memberId) {
      setItems([]);
      return;
    }
    const response = await fetch(
      `/api/notifications?teamMemberId=${encodeURIComponent(memberId)}`,
    );
    if (!response.ok) {
      setItems([]);
      return;
    }
    setItems((await response.json()) as AppNotification[]);
  }, [memberId]);

  useEffect(() => {
    void load();
    if (!memberId) return;
    const timer = window.setInterval(() => {
      void load();
    }, 30000);
    return () => window.clearInterval(timer);
  }, [load, memberId]);

  const unread = items.filter((item) => !item.readAt).length;

  async function markAllRead() {
    if (!memberId) return;
    await fetch("/api/notifications", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ teamMemberId: memberId, markAllRead: true }),
    });
    await load();
  }

  async function markOne(id: string) {
    await fetch(`/api/notifications/${id}`, { method: "PATCH" });
    await load();
  }

  return (
    <div className="relative">
      <Button
        type="button"
        variant="ghost"
        size="sm"
        className="relative h-8 w-8 px-0"
        onClick={() => setOpen((current) => !current)}
        aria-label="การแจ้งเตือน"
        disabled={!memberId}
        title={memberId ? "การแจ้งเตือน" : "เข้าสู่ระบบก่อนดูการแจ้งเตือน"}
      >
        <Bell className="h-4 w-4" />
        {unread > 0 ? (
          <span className="absolute -top-0.5 -right-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-red-500 px-1 text-[10px] font-semibold text-white">
            {unread > 9 ? "9+" : unread}
          </span>
        ) : null}
      </Button>

      {open && memberId ? (
        <div className="absolute top-full right-0 z-50 mt-1 w-80 rounded-xl border border-slate-200 bg-white p-2 shadow-lg">
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
