"use client";

import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import { Suspense, useEffect, useState } from "react";
import {
  ChevronLeft,
  ClipboardList,
  FolderKanban,
  History,
  LayoutDashboard,
  LayoutGrid,
  Menu,
  PanelLeftClose,
  PanelLeftOpen,
  Settings2,
  X,
} from "lucide-react";
import { cn } from "@/lib/utils";

const SIDEBAR_COLLAPSED_KEY = "fwf-sidebar-collapsed";

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
  collapsed = false,
  onToggleCollapsed,
}: {
  onNavigate?: () => void;
  className?: string;
  collapsed?: boolean;
  onToggleCollapsed?: () => void;
}) {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const projectId = searchParams.get("project");

  return (
    <aside
      className={cn(
        "flex h-full flex-col border-r border-slate-200 bg-white transition-[width] duration-200",
        collapsed ? "w-[72px]" : "w-64",
        className,
      )}
    >
      <div
        className={cn(
          "border-b border-slate-200 py-4",
          collapsed ? "px-3" : "px-4",
        )}
      >
        <Link
          href="/projects"
          onClick={onNavigate}
          className={cn(
            "flex items-center",
            collapsed ? "justify-center" : "gap-2.5",
          )}
          title="FWF Task Manager"
        >
          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary text-white">
            <FolderKanban className="h-5 w-5" />
          </span>
          {!collapsed ? (
            <div className="min-w-0">
              <p className="truncate text-sm font-bold text-primary">
                FWF Task Manager
              </p>
              <p className="truncate text-xs text-slate-500">
                Foreigner Worker Fund
              </p>
            </div>
          ) : null}
        </Link>
      </div>

      <nav className={cn("flex-1 space-y-1 overflow-y-auto", collapsed ? "p-2" : "p-3")}>
        {!collapsed ? (
          <p className="px-2 pb-2 text-[11px] font-semibold tracking-wide text-slate-400 uppercase">
            เมนู
          </p>
        ) : null}
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = item.match(pathname);
          const href = resolveHref(item.id, pathname, projectId);

          return (
            <Link
              key={item.id}
              href={href}
              onClick={onNavigate}
              title={collapsed ? item.label : undefined}
              className={cn(
                "flex rounded-xl transition",
                collapsed
                  ? "items-center justify-center px-2 py-2.5"
                  : "items-start gap-3 px-3 py-2.5",
                isActive
                  ? "bg-primary/10 text-primary"
                  : "text-slate-600 hover:bg-slate-50 hover:text-slate-900",
              )}
            >
              <Icon
                className={cn(
                  "h-4 w-4 shrink-0",
                  !collapsed && "mt-0.5",
                  isActive ? "text-primary" : "text-slate-400",
                )}
              />
              {!collapsed ? (
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
              ) : null}
            </Link>
          );
        })}
      </nav>

      {!collapsed ? (
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
      ) : null}

      {onToggleCollapsed ? (
        <div
          className={cn(
            "shrink-0 border-t border-slate-200",
            collapsed ? "p-2" : "p-3",
          )}
        >
          <button
            type="button"
            onClick={(event) => {
              event.preventDefault();
              event.stopPropagation();
              onToggleCollapsed();
            }}
            className={cn(
              "flex w-full items-center rounded-xl text-slate-600 transition hover:bg-slate-50 hover:text-slate-900",
              collapsed
                ? "justify-center px-2 py-2.5"
                : "justify-between gap-2 px-3 py-2.5",
            )}
            aria-label={collapsed ? "ขยายเมนู" : "ย่อเมนู"}
            title={collapsed ? "ขยายเมนู" : "ย่อเมนู"}
          >
            {!collapsed ? (
              <span className="inline-flex items-center gap-2 text-sm font-medium">
                <PanelLeftClose className="h-4 w-4 text-slate-400" />
                ย่อเมนู
              </span>
            ) : (
              <PanelLeftOpen className="h-4 w-4 text-slate-400" />
            )}
            {!collapsed ? (
              <ChevronLeft className="h-4 w-4 text-slate-400" />
            ) : (
              <span className="sr-only">ขยายเมนู</span>
            )}
          </button>
        </div>
      ) : null}
    </aside>
  );
}

function SidebarFallback({
  className,
  collapsed = false,
}: {
  className?: string;
  collapsed?: boolean;
}) {
  return (
    <aside
      className={cn(
        "flex h-full flex-col border-r border-slate-200 bg-white",
        collapsed ? "w-[72px]" : "w-64",
        className,
      )}
    >
      <div
        className={cn(
          "border-b border-slate-200 py-4",
          collapsed ? "px-3" : "px-4",
        )}
      >
        <div
          className={cn(
            "flex items-center",
            collapsed ? "justify-center" : "gap-2.5",
          )}
        >
          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary text-white">
            <FolderKanban className="h-5 w-5" />
          </span>
          {!collapsed ? (
            <div className="min-w-0">
              <p className="truncate text-sm font-bold text-primary">
                FWF Task Manager
              </p>
              <p className="truncate text-xs text-slate-500">
                Foreigner Worker Fund
              </p>
            </div>
          ) : null}
        </div>
      </div>
    </aside>
  );
}

export function AppShell({ children }: { children: React.ReactNode }) {
  const [mobileOpen, setMobileOpen] = useState(false);
  const [collapsed, setCollapsed] = useState(false);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    try {
      const stored = localStorage.getItem(SIDEBAR_COLLAPSED_KEY);
      if (stored === "1") setCollapsed(true);
    } catch {
      // ignore
    }
    setHydrated(true);
  }, []);

  function toggleCollapsed() {
    setCollapsed((current) => {
      const next = !current;
      try {
        localStorage.setItem(SIDEBAR_COLLAPSED_KEY, next ? "1" : "0");
      } catch {
        // ignore
      }
      return next;
    });
  }

  return (
    <div className="flex min-h-screen bg-[#F8FAFC]">
      <div className="relative z-40 hidden lg:sticky lg:top-0 lg:flex lg:h-screen lg:shrink-0">
        <Suspense
          fallback={
            <SidebarFallback collapsed={hydrated ? collapsed : false} />
          }
        >
          <SidebarNav
            collapsed={collapsed}
            onToggleCollapsed={toggleCollapsed}
          />
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
