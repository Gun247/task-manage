import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

/** Shared inset used inside the main content card */
export const pageInset = "px-4 sm:px-5";

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
  dense = false,
}: {
  icon?: ReactNode;
  title: ReactNode;
  description?: ReactNode;
  actions?: ReactNode;
  children?: ReactNode;
  className?: string;
  dense?: boolean;
}) {
  return (
    <div className={cn("relative z-[1] border-b border-slate-200/70 bg-white", className)}>
      <div
        className={cn(
          "mx-auto w-full max-w-[90rem]",
          pageInset,
          dense ? "py-3" : "py-5",
        )}
      >
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between sm:gap-4">
          <div className="flex min-w-0 items-start gap-3">
            {icon ? (
              <span className="mt-0.5 flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-slate-100 text-slate-700">
                {icon}
              </span>
            ) : null}
            <div className="min-w-0">
              <h1 className="text-xl font-bold tracking-tight text-slate-900 sm:text-2xl">
                {title}
              </h1>
              {description ? (
                <p className="mt-1 max-w-2xl text-sm leading-relaxed text-slate-500">
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
        {children ? <div className="mt-4">{children}</div> : null}
      </div>
    </div>
  );
}

export function PageMain({
  children,
  className,
  width = "7xl",
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
        "relative z-[1] mx-auto w-full py-5",
        pageInset,
        widthClass,
        className,
      )}
    >
      {children}
    </main>
  );
}
