"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { FolderKanban, LayoutGrid, Settings2 } from "lucide-react";
import { cn } from "@/lib/utils";

const navItems = [
  { href: "/projects", label: "โปรเจกต์ทั้งหมด", icon: LayoutGrid },
  { href: "/projects/manage", label: "จัดการโปรเจกต์", icon: Settings2 },
];

export function AppNav() {
  const pathname = usePathname();

  return (
    <header className="border-b border-slate-200 bg-white">
      <div className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-4 py-3 lg:px-8">
        <Link href="/projects" className="flex min-w-0 items-center gap-2.5">
          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-[#1E3A5F] text-white">
            <FolderKanban className="h-4.5 w-4.5" />
          </span>
          <div className="min-w-0">
            <p className="truncate text-sm font-bold text-[#1E3A5F]">
              FWF Task Manager
            </p>
            <p className="truncate text-xs text-slate-500">
              Foreigner Worker Fund
            </p>
          </div>
        </Link>

        <nav className="flex items-center gap-1 rounded-xl bg-slate-100 p-1">
          {navItems.map((item) => {
            const isActive =
              item.href === "/projects/manage"
                ? pathname === "/projects/manage"
                : pathname === "/projects" || pathname.startsWith("/tasks");
            const Icon = item.icon;

            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  "inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-medium transition sm:text-sm",
                  isActive
                    ? "bg-white text-[#1E3A5F] shadow-sm"
                    : "text-slate-500 hover:text-slate-700",
                )}
              >
                <Icon className="h-3.5 w-3.5" />
                <span className="hidden sm:inline">{item.label}</span>
              </Link>
            );
          })}
        </nav>
      </div>
    </header>
  );
}
