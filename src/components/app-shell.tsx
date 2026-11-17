"use client";

import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { Suspense, useEffect, useState } from "react";
import {
  CalendarRange,
  FolderKanban,
  History,
  LayoutDashboard,
  LayoutGrid,
  Plus,
  Settings2,
} from "lucide-react";
import { AuthGate } from "@/components/auth-gate";
import { ProjectThemeSync } from "@/components/project-theme-sync";
import { SessionControls } from "@/components/session-controls";
import { readMemberSession } from "@/lib/current-member";
import { canManageProjects } from "@/lib/roles";
import { cn } from "@/lib/utils";

const navItems = [
  {
    id: "dashboard",
    label: "Dashboard",
    icon: LayoutDashboard,
    match: (pathname: string) => pathname.startsWith("/dashboard"),
  },
  {
    id: "projects",
    label: "โปรเจกต์",
    icon: LayoutGrid,
    match: (pathname: string) =>
      pathname === "/projects" || pathname.startsWith("/tasks"),
  },
  {
    id: "timeline",
    label: "Timeline",
    icon: CalendarRange,
    match: (pathname: string) => pathname.startsWith("/timeline"),
  },
  {
    id: "history",
    label: "ประวัติ",
    icon: History,
    match: (pathname: string) => pathname.startsWith("/history"),
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
  return projectId ? `/timeline?project=${projectId}` : "/timeline";
}

function useShowManage() {
  const [showManage, setShowManage] = useState(false);

  useEffect(() => {
    const sync = () => {
      const session = readMemberSession();
      setShowManage(session ? canManageProjects(session.role) : false);
    };
    sync();
    window.addEventListener("storage", sync);
    window.addEventListener("fwf-current-member-changed", sync);
    return () => {
      window.removeEventListener("storage", sync);
      window.removeEventListener("fwf-current-member-changed", sync);
    };
  }, []);

  return showManage;
}

function useCreateAction(showManage: boolean) {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const router = useRouter();
  const projectId = searchParams.get("project");

  return () => {
    if (pathname.startsWith("/tasks") && projectId) {
      window.dispatchEvent(new Event("fwf-open-new-task"));
      return;
    }
    router.push(showManage ? "/projects/manage" : "/projects");
  };
}

function NavLink({
  href,
  label,
  active,
  orientation,
  children,
}: {
  href: string;
  label: string;
  active: boolean;
  orientation: "side" | "dock";
  children: React.ReactNode;
}) {
  if (orientation === "dock") {
    return (
      <Link
        href={href}
        title={label}
        aria-label={label}
        aria-current={active ? "page" : undefined}
        className={cn(
          "flex h-11 w-11 shrink-0 items-center justify-center rounded-full transition duration-200",
          active
            ? "bg-white text-slate-900 shadow-[0_6px_18px_rgba(15,23,42,0.12)]"
            : "text-slate-600 hover:bg-white/60 hover:text-slate-900",
        )}
      >
        {children}
      </Link>
    );
  }

  return (
    <Link
      href={href}
      aria-current={active ? "page" : undefined}
      className={cn(
        "group flex items-center gap-3 rounded-2xl px-3 py-2.5 text-sm font-medium transition duration-200",
        active
          ? "bg-white text-slate-900 shadow-[0_8px_24px_rgba(15,23,42,0.08)]"
          : "text-slate-600 hover:bg-white/55 hover:text-slate-900",
      )}
    >
      <span
        className={cn(
          "flex h-10 w-10 shrink-0 items-center justify-center rounded-full transition",
          active
            ? "bg-slate-900 text-white"
            : "bg-white/70 text-slate-600 group-hover:bg-white",
        )}
      >
        {children}
      </span>
      <span className="truncate">{label}</span>
    </Link>
  );
}

function DesktopSidebar({ showManage }: { showManage: boolean }) {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const projectId = searchParams.get("project");

  return (
    <aside className="relative z-20 hidden w-[17.5rem] shrink-0 flex-col p-3 lg:flex">
      <div className="flex h-full flex-col overflow-hidden rounded-[1.5rem] border border-white/70 bg-white/70 p-3 shadow-[0_12px_40px_rgba(15,23,42,0.06)] backdrop-blur-2xl supports-[backdrop-filter]:bg-white/55">
        <Link
          href="/dashboard"
          className="mb-3 flex items-center gap-2.5 rounded-2xl px-2.5 py-2"
        >
          <span className="flex h-10 w-10 items-center justify-center rounded-2xl bg-slate-900 text-white shadow-[0_8px_20px_rgba(15,23,42,0.2)]">
            <FolderKanban className="h-[1.125rem] w-[1.125rem]" />
          </span>
          <span className="min-w-0">
            <span className="block truncate text-sm font-bold tracking-tight text-slate-900">
              TIM TaskManage
            </span>
            <span className="block text-[11px] text-slate-500">Workspace</span>
          </span>
        </Link>

        <nav aria-label="เมนูหลัก" className="flex min-h-0 flex-1 flex-col gap-1.5">
          {navItems.map((item) => {
            const Icon = item.icon;
            return (
              <NavLink
                key={item.id}
                href={resolveHref(item.id, pathname, projectId)}
                label={item.label}
                active={item.match(pathname)}
                orientation="side"
              >
                <Icon className="h-[1.15rem] w-[1.15rem]" strokeWidth={1.75} />
              </NavLink>
            );
          })}

          {showManage ? (
            <NavLink
              href="/projects/manage"
              label="Manage"
              active={pathname === "/projects/manage"}
              orientation="side"
            >
              <Settings2 className="h-[1.15rem] w-[1.15rem]" strokeWidth={1.75} />
            </NavLink>
          ) : null}
        </nav>

        <div className="mt-3 rounded-2xl border border-white/80 bg-white/80 p-2 shadow-sm">
          <SessionControls />
        </div>
      </div>
    </aside>
  );
}

function MobileTopBar() {
  return (
    <header className="relative z-20 flex shrink-0 items-center justify-between gap-3 px-3 pt-[max(0.75rem,env(safe-area-inset-top))] pb-3 lg:hidden">
      <Link href="/dashboard" className="inline-flex min-w-0 items-center gap-2.5">
        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-2xl bg-slate-900 text-white shadow-sm">
          <FolderKanban className="h-4 w-4" />
        </span>
        <span className="truncate text-sm font-bold tracking-tight text-slate-800">
          TIM TaskManage
        </span>
      </Link>
      <SessionControls />
    </header>
  );
}

function MobileDock({ showManage }: { showManage: boolean }) {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const projectId = searchParams.get("project");
  const handleCreate = useCreateAction(showManage);
  const left = navItems.slice(0, 2);
  const right = navItems.slice(2);

  return (
    <nav
      aria-label="เมนูหลัก"
      className="pointer-events-none fixed inset-x-0 bottom-0 z-50 flex justify-center px-4 pb-[max(0.85rem,env(safe-area-inset-bottom))] lg:hidden"
    >
      <div className="pointer-events-auto flex max-w-full items-center gap-1 overflow-x-auto rounded-full border border-white/80 bg-white/70 p-1.5 shadow-[0_14px_44px_rgba(15,23,42,0.14)] backdrop-blur-2xl supports-[backdrop-filter]:bg-white/55 sm:gap-1.5 sm:px-2">
        {left.map((item) => {
          const Icon = item.icon;
          return (
            <NavLink
              key={item.id}
              href={resolveHref(item.id, pathname, projectId)}
              label={item.label}
              active={item.match(pathname)}
              orientation="dock"
            >
              <Icon className="h-[1.2rem] w-[1.2rem]" strokeWidth={1.75} />
            </NavLink>
          );
        })}

        <button
          type="button"
          onClick={handleCreate}
          aria-label={
            pathname.startsWith("/tasks") && projectId
              ? "สร้าง task ใหม่"
              : "สร้างใหม่"
          }
          className="mx-0.5 flex h-[3.15rem] w-[3.15rem] shrink-0 items-center justify-center rounded-full bg-[linear-gradient(160deg,#6BB8FF_0%,#3B82F6_55%,#2563EB_100%)] text-white shadow-[0_12px_28px_rgba(59,130,246,0.45)] transition hover:brightness-105 active:scale-[0.96]"
        >
          <Plus className="h-5 w-5" strokeWidth={2.4} />
        </button>

        {right.map((item) => {
          const Icon = item.icon;
          return (
            <NavLink
              key={item.id}
              href={resolveHref(item.id, pathname, projectId)}
              label={item.label}
              active={item.match(pathname)}
              orientation="dock"
            >
              <Icon className="h-[1.2rem] w-[1.2rem]" strokeWidth={1.75} />
            </NavLink>
          );
        })}

        {showManage ? (
          <NavLink
            href="/projects/manage"
            label="Manage"
            active={pathname === "/projects/manage"}
            orientation="dock"
          >
            <Settings2 className="h-[1.2rem] w-[1.2rem]" strokeWidth={1.75} />
          </NavLink>
        ) : null}
      </div>
    </nav>
  );
}

function ShellChrome({ children }: { children: React.ReactNode }) {
  const showManage = useShowManage();

  return (
    <div className="relative flex h-svh overflow-hidden bg-[linear-gradient(165deg,#e8f1ff_0%,#f5f8fc_42%,#eef8f1_100%)]">
      <Suspense fallback={null}>
        <ProjectThemeSync />
      </Suspense>

      <div
        className="pointer-events-none absolute inset-0 overflow-hidden"
        aria-hidden
      >
        <div className="absolute -left-28 top-0 h-72 w-72 rounded-full bg-[color-mix(in_srgb,#93c5fd_28%,transparent)] blur-3xl" />
        <div className="absolute right-[-4rem] top-24 h-80 w-80 rounded-full bg-[color-mix(in_srgb,var(--accent)_16%,transparent)] blur-3xl" />
        <div className="absolute bottom-10 left-1/3 h-64 w-64 rounded-full bg-[color-mix(in_srgb,#bbf7d0_22%,transparent)] blur-3xl" />
      </div>

      <Suspense fallback={null}>
        <DesktopSidebar showManage={showManage} />
      </Suspense>

      <div className="relative z-10 flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden">
        <MobileTopBar />

        <div className="flex min-h-0 flex-1 flex-col px-3 pb-[calc(5.75rem+env(safe-area-inset-bottom))] pt-0 lg:p-3">
          <div className="flex min-h-0 flex-1 flex-col overflow-hidden rounded-[1.5rem] border border-white/70 bg-white/85 shadow-[0_12px_40px_rgba(15,23,42,0.06)] backdrop-blur-xl">
            <div className="min-h-0 flex-1 overflow-y-auto overscroll-y-contain">
              {children}
            </div>
          </div>
        </div>
      </div>

      <Suspense fallback={null}>
        <MobileDock showManage={showManage} />
      </Suspense>
    </div>
  );
}

export function AppShell({ children }: { children: React.ReactNode }) {
  return (
    <AuthGate>
      <ShellChrome>{children}</ShellChrome>
    </AuthGate>
  );
}
