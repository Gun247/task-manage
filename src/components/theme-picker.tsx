"use client";

import { useState, useSyncExternalStore } from "react";
import { Check, Palette } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  DEFAULT_THEME_ID,
  THEME_GROUPS,
  THEMES,
  applyTheme,
  readTheme,
  type ThemeOption,
} from "@/lib/themes";
import { cn } from "@/lib/utils";

function subscribe(onChange: () => void) {
  const observer = new MutationObserver(onChange);
  observer.observe(document.documentElement, {
    attributes: true,
    attributeFilter: ["data-theme"],
  });
  return () => observer.disconnect();
}

function useCurrentTheme() {
  return useSyncExternalStore(subscribe, readTheme, () => DEFAULT_THEME_ID);
}

function Swatches({
  colors,
  className,
}: {
  colors: ThemeOption["swatches"];
  className?: string;
}) {
  return (
    <span className={cn("flex shrink-0 -space-x-1", className)}>
      {colors.map((color, index) => (
        <span
          key={index}
          className="h-4 w-4 rounded-full ring-2 ring-white"
          style={{ backgroundColor: color }}
        />
      ))}
    </span>
  );
}

export function ThemePicker({ collapsed = false }: { collapsed?: boolean }) {
  const [open, setOpen] = useState(false);
  const currentId = useCurrentTheme();
  const current = THEMES.find((theme) => theme.id === currentId) ?? THEMES[0];

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className={cn(
          "flex w-full items-center rounded-xl text-slate-600 transition hover:bg-slate-50 hover:text-slate-900",
          collapsed
            ? "justify-center px-2 py-2.5"
            : "justify-between gap-2 px-3 py-2.5",
        )}
        aria-label="เปลี่ยนธีมสี"
        title={collapsed ? `ธีมสี: ${current.label}` : undefined}
      >
        {collapsed ? (
          <Palette className="h-4 w-4 text-slate-400" />
        ) : (
          <>
            <span className="inline-flex min-w-0 items-center gap-2 text-sm font-medium">
              <Palette className="h-4 w-4 shrink-0 text-slate-400" />
              <span className="truncate">ธีมสี</span>
            </span>
            <Swatches colors={current.swatches} />
          </>
        )}
      </button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="flex h-[min(90vh,760px)] max-w-4xl flex-col gap-0 overflow-hidden p-0">
          <DialogHeader className="mb-0 shrink-0 border-b border-slate-100 px-6 py-4 pr-12">
            <DialogTitle>ธีมสี</DialogTitle>
            <DialogDescription>
              เลือกแล้วเปลี่ยนทันที และจำไว้ในเบราว์เซอร์นี้ · ตอนนี้ใช้{" "}
              {current.label}
            </DialogDescription>
          </DialogHeader>

          <div className="min-h-0 flex-1 space-y-6 overflow-y-auto px-6 py-5">
            {THEME_GROUPS.map((group) => {
              const items = THEMES.filter((theme) => theme.group === group.id);
              return (
                <section key={group.id}>
                  <h3 className="mb-2 text-caption font-semibold tracking-wide text-slate-500 uppercase">
                    {group.label} · {items.length}
                  </h3>
                  <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-3">
                    {items.map((theme) => {
                      const active = theme.id === currentId;
                      return (
                        <button
                          key={theme.id}
                          type="button"
                          onClick={() => applyTheme(theme.id)}
                          aria-pressed={active}
                          className={cn(
                            "flex items-center gap-3 rounded-xl border bg-white p-2.5 text-left transition",
                            active
                              ? "border-primary ring-2 ring-primary/30"
                              : "border-slate-200 hover:border-slate-300 hover:bg-slate-50",
                          )}
                        >
                          <span
                            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg text-white"
                            style={{
                              background: `linear-gradient(135deg, ${theme.swatches[1]}, ${theme.swatches[0]})`,
                            }}
                          >
                            {active ? <Check className="h-4 w-4" /> : null}
                          </span>
                          <span className="min-w-0 flex-1">
                            <span className="block truncate text-sm font-medium text-slate-800">
                              {theme.label}
                            </span>
                            <span className="block truncate text-xs text-slate-500">
                              {theme.description}
                            </span>
                          </span>
                          <Swatches colors={theme.swatches} />
                        </button>
                      );
                    })}
                  </div>
                </section>
              );
            })}
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
