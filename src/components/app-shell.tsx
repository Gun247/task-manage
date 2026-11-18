"use client";

import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { Suspense, useEffect, useState } from "react";
import {
  CalendarRange,
  ChevronLeft,
  ChevronRight,
  FolderKanban,
  History,
  LayoutDashboard,
  LayoutGrid,
  ListTodo,
  Plus,
  Settings2,
} from "lucide-react";
import { AuthGate } from "@/components/auth-gate";
import { ProjectSwitcher } from "@/components/project-switcher";
import { ProjectThemeSync } from "@/components/project-theme-sync";
import {
  ShellHeaderProvider,
  ShellPageHeader,
  ShellPageHeaderIcon,
} from "@/components/page-layout";
import { SessionControls, SidebarProfile } from "@/components/session-controls";
import { fetchJsonArray } from "@/lib/fetch-json";
import { readMemberSession } from "@/lib/current-member";
import { canManageProjects } from "@/lib/roles";
import { themeAccentColor, themeSwatches } from "@/lib/themes";
import type { Project } from "@/lib/types";
import { cn } from "@/lib/utils";

function projectIconGradient(project?: Project | null) {
  if (!project) return "linear-gradient(160deg, #1e293b 0%, #0f172a 100%)";
  const swatches = themeSwatches(project.theme);
  const a = swatches[0] ?? themeAccentColor(project.theme) ?? project.color ?? "#0f172a";
  const b = swatches[1] ?? a;
  const c = swatches[2] ?? b;
  return `linear-gradient(160deg, ${a} 0%, ${b} 55%, ${c} 100%)`;
}

const SIDEBAR_COLLAPSED_KEY = "fwf-sidebar-collapsed";

type NavItemId = "dashboard" | "projects" | "timeline" | "history" | "manage";

const navItems: Array<{
  id: NavItemId;
  label: string;
  icon: typeof LayoutDashboard;
  match: (pathname: string) => boolean;
  manageOnly?: boolean;
}> = [
  {
    id: "dashboard",
    label: "Dashboard",
    icon: LayoutDashboard,
    match: (pathname) => pathname.startsWith("/dashboard"),
  },
  {
    id: "projects",
    label: "โปรเจกต์",
    icon: LayoutGrid,
    match: (pathname) =>
      pathname === "/projects" || pathname.startsWith("/tasks"),
  },
  {
    id: "timeline",
    label: "Timeline",
    icon: CalendarRange,
    match: (pathname) => pathname.startsWith("/timeline"),
  },
  {
    id: "history",
    label: "ประวัติ",
    icon: History,
    match: (pathname) => pathname.startsWith("/history"),
  },
  {
    id: "manage",
    label: "Manage",
    icon: Settings2,
    match: (pathname) => pathname === "/projects/manage",
    manageOnly: true,
  },
];

const navGroups: Array<{
  id: string;
  label: string;
  itemIds: NavItemId[];
}> = [
  {
    id: "general",
    label: "ทั่วไป",
    itemIds: ["dashboard", "projects"],
  },
  {
    id: "track",
    label: "ติดตาม",
    itemIds: ["timeline", "history"],
  },
  {
    id: "system",
    label: "ระบบ",
    itemIds: ["manage"],
  },
];

function resolveHref(
  id: NavItemId,
  pathname: string,
  projectId: string | null,
) {
  if (id === "dashboard") return "/dashboard";
  if (id === "manage") return "/projects/manage";
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

function useSidebarCollapsed() {
  const [collapsed, setCollapsed] = useState(false);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    try {
      setCollapsed(localStorage.getItem(SIDEBAR_COLLAPSED_KEY) === "1");
    } catch {
      setCollapsed(false);
    }
    setReady(true);
  }, []);

  useEffect(() => {
    if (!ready) return;
    try {
      localStorage.setItem(SIDEBAR_COLLAPSED_KEY, collapsed ? "1" : "0");
    } catch {
      /* ignore */
    }
  }, [collapsed, ready]);

  return {
    collapsed,
    toggle: () => setCollapsed((value) => !value),
  };
}

function NavLink({
  href,
  label,
  active,
  orientation,
  collapsed = false,
  children,
}: {
  href: string;
  label: string;
  active: boolean;
  orientation: "side" | "dock";
  collapsed?: boolean;
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

  if (collapsed) {
    return (
      <Link
        href={href}
        title={label}
        aria-label={label}
        aria-current={active ? "page" : undefined}
        className={cn(
          "mx-auto flex h-9 w-9 items-center justify-center rounded-xl transition duration-200",
          active
            ? "bg-slate-900 text-white shadow-[0_6px_16px_rgba(15,23,42,0.16)]"
            : "text-slate-600 hover:bg-white/70 hover:text-slate-900",
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

function SidebarBrand({
  collapsed,
  projects,
  projectId,
  onSelectProject,
}: {
  collapsed: boolean;
  projects: Project[];
  projectId: string | null;
  onSelectProject: (projectId: string) => void;
}) {
  const selectedProject = projects.find((project) => project.id === projectId);
  const iconGradient = projectIconGradient(selectedProject);

  if (collapsed) {
    return (
      <Link
        href={projectId ? `/tasks?project=${projectId}` : "/dashboard"}
        className="flex justify-center"
        title={selectedProject?.name ?? "TIM TaskManage"}
      >
        <span
          className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl text-white shadow-[0_8px_20px_rgba(15,23,42,0.2)]"
          style={{ backgroundImage: iconGradient }}
        >
          {selectedProject ? (
            <span className="text-[11px] font-bold">
              {selectedProject.name.slice(0, 2).toUpperCase()}
            </span>
          ) : (
            <FolderKanban className="h-4 w-4" />
          )}
        </span>
      </Link>
    );
  }

  if (selectedProject) {
    return (
      <div className="flex min-w-0 flex-1 items-start gap-2 px-0.5">
        <span
          className="mt-0.5 flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl text-white shadow-[0_8px_20px_rgba(15,23,42,0.2)]"
          style={{ backgroundImage: iconGradient }}
        >
          <FolderKanban className="h-[1.125rem] w-[1.125rem]" />
        </span>
        <ProjectSwitcher
          variant="sidebar"
          className="min-w-0 flex-1"
          projects={projects}
          selectedProjectId={selectedProject.id}
          onSelect={onSelectProject}
        />
      </div>
    );
  }

  return (
    <Link
      href="/dashboard"
      className="flex min-w-0 flex-1 items-center gap-2.5 rounded-2xl px-1.5 py-0.5"
      title="TIM TaskManage"
    >
      <span
        className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl text-white shadow-[0_8px_20px_rgba(15,23,42,0.2)]"
        style={{ backgroundImage: projectIconGradient(null) }}
      >
        <FolderKanban className="h-[1.125rem] w-[1.125rem]" />
      </span>
      <span className="min-w-0">
        <span className="block truncate text-sm font-bold tracking-tight text-slate-900">
          TIM TaskManage
        </span>
        <span className="block text-[11px] text-slate-500">Workspace</span>
      </span>
    </Link>
  );
}

function DesktopSidebar({
  showManage,
  collapsed,
  onToggleCollapsed,
}: {
  showManage: boolean;
  collapsed: boolean;
  onToggleCollapsed: () => void;
}) {
  const pathname = usePathname();
  const router = useRouter();
  const searchParams = useSearchParams();
  const projectId = searchParams.get("project");
  const toggle = onToggleCollapsed;
  const [projects, setProjects] = useState<Project[]>([]);

  useEffect(() => {
    let cancelled = false;
    fetchJsonArray<Project>("/api/projects")
      .then((data) => {
        if (!cancelled) setProjects(data);
      })
      .catch(() => {
        if (!cancelled) setProjects([]);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const itemById = Object.fromEntries(
    navItems.map((item) => [item.id, item]),
  ) as Record<NavItemId, (typeof navItems)[number]>;

  return (
    <aside
      className={cn(
        "relative z-20 hidden h-full min-h-0 shrink-0 flex-col transition-[width] duration-300 ease-out lg:flex",
        collapsed ? "w-[4rem]" : "w-[16rem]",
      )}
    >
      <div
        className={cn(
          "flex h-full min-h-0 flex-col border border-white/70 bg-white/70 shadow-[0_12px_40px_rgba(15,23,42,0.06)] backdrop-blur-2xl supports-[backdrop-filter]:bg-white/55",
          collapsed
            ? "items-center overflow-hidden rounded-[1.25rem] px-1.5 py-2.5"
            : "overflow-visible rounded-[1.5rem] p-3",
        )}
      >
        <div
          className={cn(
            "relative z-40 mb-2.5 flex items-center gap-1",
            collapsed ? "w-full flex-col gap-1" : "justify-between",
          )}
        >
          <SidebarBrand
            collapsed={collapsed}
            projects={projects}
            projectId={projectId}
            onSelectProject={(id) => {
              if (pathname.startsWith("/timeline")) {
                router.push(`/timeline?project=${id}`);
              } else if (pathname.startsWith("/history")) {
                router.push(`/history?project=${id}`);
              } else {
                router.push(`/tasks?project=${id}`);
              }
            }}
          />

          <button
            type="button"
            onClick={toggle}
            className={cn(
              "flex shrink-0 items-center justify-center rounded-xl text-slate-500 transition hover:bg-white/80 hover:text-slate-800",
              collapsed ? "h-7 w-7" : "h-9 w-9",
            )}
            aria-label={collapsed ? "ขยายแถบด้านข้าง" : "ย่อแถบด้านข้าง"}
            title={collapsed ? "ขยาย" : "ย่อ"}
          >
            {collapsed ? (
              <ChevronRight className="h-3.5 w-3.5" />
            ) : (
              <ChevronLeft className="h-4 w-4" />
            )}
          </button>
        </div>

        <nav
          aria-label="เมนูหลัก"
          className={cn(
            "relative z-0 flex min-h-0 flex-1 flex-col overflow-y-auto overscroll-contain",
            collapsed ? "w-full items-center gap-2.5" : "gap-4",
          )}
        >
          {navGroups.map((group) => {
            const items = group.itemIds
              .map((id) => itemById[id])
              .filter((item) => item && (!item.manageOnly || showManage));
            if (items.length === 0) return null;

            return (
              <div
                key={group.id}
                className={cn(
                  collapsed ? "flex w-full flex-col items-center gap-1" : "space-y-1.5",
                )}
              >
                {collapsed ? (
                  <div
                    className="mx-auto h-px w-4 bg-slate-200/90 first:hidden"
                    aria-hidden
                  />
                ) : (
                  <p className="px-3 text-[10px] font-semibold tracking-[0.14em] text-slate-400 uppercase">
                    {group.label}
                  </p>
                )}
                <div
                  className={cn(
                    "flex flex-col",
                    collapsed ? "items-center gap-0.5" : "gap-1",
                  )}
                >
                  {items.map((item) => {
                    const Icon = item.icon;
                    return (
                      <NavLink
                        key={item.id}
                        href={resolveHref(item.id, pathname, projectId)}
                        label={item.label}
                        active={item.match(pathname)}
                        orientation="side"
                        collapsed={collapsed}
                      >
                        <Icon
                          className={
                            collapsed ? "h-4 w-4" : "h-[1.15rem] w-[1.15rem]"
                          }
                          strokeWidth={1.75}
                        />
                      </NavLink>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </nav>
      </div>
    </aside>
  );
}

function resolvePageTitle(pathname: string) {
  if (pathname.startsWith("/dashboard")) return "Dashboard";
  if (pathname.startsWith("/projects/manage")) return "จัดการโปรเจกต์";
  if (pathname.startsWith("/projects")) return "โปรเจกต์ทั้งหมด";
  if (pathname.startsWith("/tasks")) return "Tasks";
  if (pathname.startsWith("/timeline")) return "สรุป Timeline";
  if (pathname.startsWith("/history")) return "ประวัติ Task";
  return "TIM TaskManage";
}

function resolvePageIcon(pathname: string) {
  const className = "h-4 w-4";
  if (pathname.startsWith("/dashboard")) {
    return <LayoutDashboard className={className} />;
  }
  if (pathname.startsWith("/projects/manage")) {
    return <Settings2 className={className} />;
  }
  if (pathname.startsWith("/projects")) {
    return <FolderKanban className={className} />;
  }
  if (pathname.startsWith("/tasks")) {
    return <ListTodo className={className} />;
  }
  if (pathname.startsWith("/timeline")) {
    return <CalendarRange className={className} />;
  }
  if (pathname.startsWith("/history")) {
    return <History className={className} />;
  }
  return <FolderKanban className={className} />;
}

function DesktopTopBar({
  collapsed,
  pageTitle,
}: {
  collapsed: boolean;
  pageTitle: string;
}) {
  return (
    <ShellPageHeader
      collapsed={collapsed}
      fallbackTitle={pageTitle}
      profile={<SidebarProfile placement="topbar" />}
    />
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
  const dockItems = navItems.filter(
    (item) => item.id !== "manage" || showManage,
  );
  const left = dockItems.slice(0, 2);
  const right = dockItems.slice(2);

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
      </div>
    </nav>
  );
}

function ShellChrome({ children }: { children: React.ReactNode }) {
  const showManage = useShowManage();
  const { collapsed, toggle } = useSidebarCollapsed();
  const pathname = usePathname();
  const pageTitle = resolvePageTitle(pathname);

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

      <div className="relative z-10 flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden">
        <MobileTopBar />

        <div className="flex min-h-0 flex-1 flex-col px-2 pb-[calc(5.75rem+env(safe-area-inset-bottom))] pt-0 lg:p-2">
          <div className="hidden shrink-0 gap-2 lg:flex">
            <ShellPageHeaderIcon
              collapsed={collapsed}
              fallbackTitle={pageTitle}
              fallbackIcon={resolvePageIcon(pathname)}
            />
            <DesktopTopBar collapsed={collapsed} pageTitle={pageTitle} />
          </div>
          <div className="flex min-h-0 flex-1 gap-2">
            <Suspense fallback={null}>
              <DesktopSidebar
                showManage={showManage}
                collapsed={collapsed}
                onToggleCollapsed={toggle}
              />
            </Suspense>
            <div className="flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden rounded-[1.25rem] border border-white/70 bg-white/85 shadow-[0_12px_40px_rgba(15,23,42,0.06)] backdrop-blur-xl lg:rounded-[1.35rem]">
              <div className="flex min-h-0 flex-1 flex-col overflow-y-auto overscroll-y-contain">
                {children}
              </div>
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
      <ShellHeaderProvider>
        <ShellChrome>{children}</ShellChrome>
      </ShellHeaderProvider>
    </AuthGate>
  );
}
