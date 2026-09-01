import type { ReactNode } from "react";
import { Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";

export type LoadingSize = "xs" | "sm" | "md" | "lg";

const spinnerSizes: Record<LoadingSize, string> = {
  xs: "h-3 w-3",
  sm: "h-4 w-4",
  md: "h-6 w-6",
  lg: "h-8 w-8",
};

interface LoadingSpinnerProps {
  size?: LoadingSize;
  className?: string;
}

export function LoadingSpinner({
  size = "md",
  className,
}: LoadingSpinnerProps) {
  return (
    <Loader2
      className={cn("animate-spin text-[#1E3A5F]", spinnerSizes[size], className)}
      aria-hidden
    />
  );
}

interface LoadingProps {
  label?: string;
  size?: LoadingSize;
  className?: string;
  labelClassName?: string;
}

export function Loading({
  label = "กำลังโหลด...",
  size = "md",
  className,
  labelClassName,
}: LoadingProps) {
  return (
    <div
      role="status"
      aria-live="polite"
      className={cn(
        "flex flex-col items-center justify-center gap-3 text-slate-500",
        className,
      )}
    >
      <LoadingSpinner size={size} />
      {label ? (
        <p className={cn("text-sm", labelClassName)}>{label}</p>
      ) : null}
    </div>
  );
}

interface LoadingCardProps {
  label?: string;
  className?: string;
}

export function LoadingCard({
  label = "กำลังโหลด...",
  className,
}: LoadingCardProps) {
  return (
    <div
      className={cn(
        "rounded-2xl border border-slate-200 bg-white p-10 sm:p-12",
        className,
      )}
    >
      <Loading label={label} />
    </div>
  );
}

interface LoadingPageProps {
  label?: string;
  className?: string;
}

export function LoadingPage({
  label = "กำลังโหลด...",
  className,
}: LoadingPageProps) {
  return (
    <div
      className={cn(
        "flex min-h-screen items-center justify-center bg-[#F8FAFC]",
        className,
      )}
    >
      <Loading label={label} size="lg" />
    </div>
  );
}

interface LoadingOverlayProps {
  label?: string;
  className?: string;
}

export function LoadingOverlay({
  label = "กำลังโหลด...",
  className,
}: LoadingOverlayProps) {
  return (
    <div
      className={cn(
        "absolute inset-0 z-10 flex items-center justify-center rounded-2xl bg-white/80 backdrop-blur-[1px]",
        className,
      )}
    >
      <Loading label={label} size="sm" />
    </div>
  );
}

interface LoadingButtonContentProps {
  loading: boolean;
  children: ReactNode;
  loadingText?: string;
}

export function LoadingButtonContent({
  loading,
  children,
  loadingText,
}: LoadingButtonContentProps) {
  if (!loading) return <>{children}</>;

  return (
    <>
      <LoadingSpinner size="sm" />
      {loadingText ?? children}
    </>
  );
}
