"use client";

import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import { Suspense, useState } from "react";
import {
  ClipboardList,
  FolderKanban,
  History,
  LayoutDashboard,
  LayoutGrid,
  Menu,
  Settings2,
  X,
} from "lucide-react";
import { cn } from "@/lib/utils";

const navItems = [
  {
    id: "dashboard",
    label: "Dashboard",
    description: "ภาพรวมงานทั้งหมด",
    icon: LayoutDashboard,
    match: (pathname: string) => pathname.startsWith("/dashboard"),
  },
  {
    id: "projects",
    label: "โปรเจกต์",
    description: "ดูและเลือกโปรเจกต์",
    icon: LayoutGrid,
    match: (pathname: string) =>
      pathname === "/projects" || pathname.startsWith("/tasks"),
  },
  {
    id: "history",
    label: "ประวัติ Task",
    description: "ไทม์ไลน์เปลี่ยนสถานะ",
    icon: History,
    match: (pathname: string) => pathname.startsWith("/history"),
  },
  {
    id: "manage",
    label: "จัดการโปรเจกต์",
    description: "สร้าง แก้ไข ลบ",
    icon: Settings2,
    match: (pathname: string) => pathname === "/projects/manage",
  },
] as const;

function resolveHref(
  id: (typeof navItems)[number]["id"],
  pathname: string,
  projectId: string | null,
) {
  if (id === "dashboard") return "/dashboard";
  if (id === "projects") {
    if (pathname.startsWith("/tasks") && projectId) {
      return `/tasks?project=${projectId}`;
    }
    if (pathname.startsWith("/tasks")) return "/tasks";
    return "/projects";
  }
  if (id === "history") {
    return projectId ? `/history?project=${projectId}` : "/history";
  }
  return "/projects/manage";
}

function SidebarNav({
  onNavigate,
  className,
}: {
  onNavigate?: () => void;
  className?: string;
}) {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const projectId = searchParams.get("project");

  return (
    <aside
      className={cn(
        "flex h-full w-64 flex-col border-r border-slate-200 bg-white",
        className,
      )}
    >
      <div className="border-b border-slate-200 px-4 py-4">
        <Link
          href="/projects"
          onClick={onNavigate}
          className="flex items-center gap-2.5"
        >
          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary text-white">
            <FolderKanban className="h-5 w-5" />
          </span>
          <div className="min-w-0">
            <p className="truncate text-sm font-bold text-primary">
              FWF Task Manager
            </p>
            <p className="truncate text-xs text-slate-500">
              Foreigner Worker Fund
            </p>
          </div>
        </Link>
      </div>

      <nav className="flex-1 space-y-1 p-3">
        <p className="px-2 pb-2 text-[11px] font-semibold tracking-wide text-slate-400 uppercase">
          เมนู
        </p>
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = item.match(pathname);
          const href = resolveHref(item.id, pathname, projectId);

          return (
            <Link
              key={item.id}
              href={href}
              onClick={onNavigate}
              className={cn(
                "flex items-start gap-3 rounded-xl px-3 py-2.5 transition",
                isActive
                  ? "bg-primary/10 text-primary"
                  : "text-slate-600 hover:bg-slate-50 hover:text-slate-900",
              )}
            >
              <Icon
                className={cn(
                  "mt-0.5 h-4 w-4 shrink-0",
                  isActive ? "text-primary" : "text-slate-400",
                )}
              />
              <span className="min-w-0">
                <span className="block text-sm font-medium">{item.label}</span>
                <span
                  className={cn(
                    "block text-xs",
                    isActive ? "text-primary/70" : "text-slate-400",
                  )}
                >
                  {item.description}
                </span>
              </span>
            </Link>
          );
        })}
      </nav>

      <div className="border-t border-slate-200 p-4">
        <div className="rounded-xl bg-slate-50 px-3 py-3">
          <div className="mb-1 flex items-center gap-2 text-xs font-medium text-slate-700">
            <ClipboardList className="h-3.5 w-3.5 text-slate-400" />
            เคล็ดลับ
          </div>
          <p className="text-xs leading-relaxed text-slate-500">
            เปลี่ยนสถานะใน Kanban แล้วดูไทม์ไลน์ได้ที่เมนูประวัติ Task
          </p>
        </div>
      </div>
    </aside>
  );
}

function SidebarFallback({ className }: { className?: string }) {
  return (
    <aside
      className={cn(
        "flex h-full w-64 flex-col border-r border-slate-200 bg-white",
        className,
      )}
    >
      <div className="border-b border-slate-200 px-4 py-4">
        <div className="flex items-center gap-2.5">
          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary text-white">
            <FolderKanban className="h-5 w-5" />
          </span>
          <div className="min-w-0">
            <p className="truncate text-sm font-bold text-primary">
              FWF Task Manager
            </p>
            <p className="truncate text-xs text-slate-500">
              Foreigner Worker Fund
            </p>
          </div>
        </div>
      </div>
    </aside>
  );
}

export function AppShell({ children }: { children: React.ReactNode }) {
  const [mobileOpen, setMobileOpen] = useState(false);

  return (
    <div className="flex min-h-screen bg-[#F8FAFC]">
      <div className="hidden lg:sticky lg:top-0 lg:flex lg:h-screen lg:shrink-0">
        <Suspense fallback={<SidebarFallback />}>
          <SidebarNav />
        </Suspense>
      </div>

      {mobileOpen ? (
        <div className="fixed inset-0 z-50 lg:hidden">
          <button
            type="button"
            className="absolute inset-0 bg-slate-900/40"
            aria-label="ปิดเมนู"
            onClick={() => setMobileOpen(false)}
          />
          <div className="relative h-full w-72 max-w-[85vw] shadow-xl">
            <Suspense fallback={<SidebarFallback />}>
              <SidebarNav onNavigate={() => setMobileOpen(false)} />
            </Suspense>
            <button
              type="button"
              className="absolute top-3 right-3 rounded-lg p-2 text-slate-500 hover:bg-slate-100"
              onClick={() => setMobileOpen(false)}
              aria-label="ปิด"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>
      ) : null}

      <div className="flex min-w-0 flex-1 flex-col">
        <div className="sticky top-0 z-30 flex items-center gap-3 border-b border-slate-200 bg-white px-4 py-3 lg:hidden">
          <button
            type="button"
            className="rounded-lg p-2 text-slate-600 hover:bg-slate-100"
            onClick={() => setMobileOpen(true)}
            aria-label="เปิดเมนู"
          >
            <Menu className="h-5 w-5" />
          </button>
          <div className="min-w-0">
            <p className="truncate text-sm font-bold text-primary">
              FWF Task Manager
            </p>
          </div>
        </div>
        <div className="min-w-0 flex-1">{children}</div>
      </div>
    </div>
  );
}
