"use client";

import {
  createContext,
  useCallback,
  useContext,
  useLayoutEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { cn } from "@/lib/utils";

/**
 * Canonical content spacing inside the AppShell white card.
 * Keep every page header/main on these tokens so left/right edges stay aligned.
 */
export const pageInsetX = "px-4";
export const pageInsetYHeader = "py-3";
export const pageInsetYMain = "py-3 sm:py-4";
/** @deprecated use pageInsetX — kept as alias for existing imports */
export const pageInset = pageInsetX;

type ShellHeaderContent = {
  icon?: ReactNode;
  title: ReactNode;
  description?: ReactNode;
  actions?: ReactNode;
};

type ShellHeaderContextValue = {
  content: ShellHeaderContent | null;
  setContent: (content: ShellHeaderContent | null) => void;
};

const ShellHeaderContext = createContext<ShellHeaderContextValue | null>(null);

export function ShellHeaderProvider({ children }: { children: ReactNode }) {
  const [content, setContentState] = useState<ShellHeaderContent | null>(null);
  const setContent = useCallback((next: ShellHeaderContent | null) => {
    setContentState(next);
  }, []);
  const value = useMemo(
    () => ({ content, setContent }),
    [content, setContent],
  );

  return (
    <ShellHeaderContext.Provider value={value}>
      {children}
    </ShellHeaderContext.Provider>
  );
}

export function useShellHeaderContent() {
  return useContext(ShellHeaderContext);
}

/** Clean SaaS surface — Threshold-style white panels */
export function GlassPanel({
  className,
  children,
  ...props
}: React.HTMLAttributes<HTMLElement>) {
  return (
    <section
      className={cn(
        "rounded-2xl border border-slate-200/80 bg-white shadow-[0_1px_2px_rgba(15,23,42,0.04)]",
        className,
      )}
      {...props}
    >
      {children}
    </section>
  );
}

export function PageHeader({
  icon,
  title,
  description,
  actions,
  children,
  className,
  dense = true,
}: {
  icon?: ReactNode;
  title: ReactNode;
  description?: ReactNode;
  actions?: ReactNode;
  children?: ReactNode;
  className?: string;
  dense?: boolean;
}) {
  const shellHeader = useShellHeaderContent();
  const setContent = shellHeader?.setContent;

  useLayoutEffect(() => {
    if (!setContent) return;
    setContent({ icon, title, description, actions });
    return () => setContent(null);
  }, [setContent, icon, title, description, actions]);

  const titleRow = (
    <div className="flex flex-col gap-2.5 sm:flex-row sm:items-center sm:justify-between sm:gap-3">
      <div className="flex min-w-0 items-center gap-2.5">
        {icon ? (
          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-slate-100 text-slate-700">
            {icon}
          </span>
        ) : null}
        <div className="min-w-0">
          <h1 className="truncate text-lg font-bold tracking-tight text-slate-900 sm:text-xl">
            {title}
          </h1>
          {description ? (
            <p className="mt-0.5 line-clamp-2 max-w-3xl text-sm leading-snug text-slate-500">
              {description}
            </p>
          ) : null}
        </div>
      </div>
      {actions ? (
        <div className="flex flex-wrap items-center gap-2 sm:justify-end">
          {actions}
        </div>
      ) : null}
    </div>
  );

  return (
    <>
      <div
        className={cn(
          "relative z-[1] border-b border-slate-200/70 bg-white lg:hidden",
          className,
        )}
      >
        <div
          className={cn(
            "w-full",
            pageInsetX,
            dense ? pageInsetYHeader : "py-4",
          )}
        >
          {titleRow}
          {children ? <div className="mt-3">{children}</div> : null}
        </div>
      </div>
      {children ? (
        <div
          className={cn(
            "relative z-[1] hidden border-b border-slate-200/70 bg-white lg:block",
            className,
          )}
        >
          <div
            className={cn(
              "w-full",
              pageInsetX,
              dense ? pageInsetYHeader : "py-4",
            )}
          >
            {children}
          </div>
        </div>
      ) : null}
    </>
  );
}

export function ShellPageHeaderIcon({
  collapsed,
  fallbackTitle,
  fallbackIcon,
}: {
  collapsed: boolean;
  fallbackTitle: string;
  fallbackIcon?: ReactNode;
}) {
  const shellHeader = useShellHeaderContent();
  const content = shellHeader?.content;
  const icon = content?.icon ?? fallbackIcon;
  const title = content?.title ?? fallbackTitle;
  const description = content?.description;

  return (
    <div
      className={cn(
        "hidden shrink-0 items-center pb-2 pt-0.5 transition-[width] duration-300 ease-out lg:flex",
        collapsed ? "w-[4rem] justify-center" : "w-[16rem]",
      )}
    >
      <div
        className={cn(
          "flex items-center border border-white/70 bg-white/70 shadow-[0_12px_40px_rgba(15,23,42,0.06)] backdrop-blur-2xl supports-[backdrop-filter]:bg-white/55",
          collapsed
            ? "h-[3.25rem] w-[3.25rem] justify-center rounded-[1.25rem]"
            : "h-14 w-full gap-2.5 rounded-[1.5rem] px-3",
        )}
      >
        {icon ? (
          <span
            className={cn(
              "flex shrink-0 items-center justify-center bg-slate-900 text-white shadow-[0_8px_20px_rgba(15,23,42,0.2)]",
              collapsed ? "h-9 w-9 rounded-xl" : "h-10 w-10 rounded-2xl",
            )}
          >
            {icon}
          </span>
        ) : (
          <span
            className={cn(
              "block shrink-0",
              collapsed ? "h-9 w-9" : "h-10 w-10",
            )}
            aria-hidden
          />
        )}
        {!collapsed ? (
          <div className="min-w-0 flex-1">
            <h1 className="truncate text-sm font-semibold tracking-tight text-slate-900">
              {title}
            </h1>
            {description ? (
              <p className="mt-0.5 truncate text-[11px] leading-tight text-slate-500">
                {description}
              </p>
            ) : null}
          </div>
        ) : null}
      </div>
    </div>
  );
}

export function ShellPageHeader({
  fallbackTitle,
  profile,
  collapsed,
}: {
  fallbackTitle: string;
  profile: ReactNode;
  collapsed: boolean;
}) {
  const shellHeader = useShellHeaderContent();
  const content = shellHeader?.content;

  return (
    <header
      className="relative z-30 flex min-h-11 min-w-0 flex-1 items-center justify-between gap-3 px-0.5 pb-2 pt-0.5"
      aria-label="แถบหัวข้อ"
    >
      {collapsed ? (
        <div className="min-w-0 flex-1 pl-1">
          <h1 className="truncate text-base font-semibold tracking-tight text-slate-900 sm:text-lg">
            {content?.title ?? fallbackTitle}
          </h1>
          {content?.description ? (
            <p className="mt-0.5 line-clamp-1 max-w-2xl text-xs leading-snug text-slate-500 sm:text-sm">
              {content.description}
            </p>
          ) : null}
        </div>
      ) : (
        <div className="min-w-0 flex-1" aria-hidden />
      )}
      <div className="flex shrink-0 items-center gap-2">
        {content?.actions ? (
          <div className="hidden items-center gap-2 sm:flex">
            {content.actions}
          </div>
        ) : null}
        {profile}
      </div>
    </header>
  );
}

export function PageMain({
  children,
  className,
  width = "full",
}: {
  children: ReactNode;
  className?: string;
  width?: "4xl" | "5xl" | "6xl" | "7xl" | "full";
}) {
  const widthClass = {
    "4xl": "max-w-4xl",
    "5xl": "max-w-5xl",
    "6xl": "max-w-6xl",
    "7xl": "max-w-[90rem]",
    full: "max-w-none",
  }[width];

  return (
    <main
      className={cn(
        "relative z-[1] w-full",
        pageInsetX,
        pageInsetYMain,
        width !== "full" && "mx-auto",
        widthClass,
        className,
      )}
    >
      {children}
    </main>
  );
}
