import { cn } from "@/lib/utils";

export function Badge({
  className,
  color,
  children,
}: {
  className?: string;
  color?: string;
  children: React.ReactNode;
}) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold",
        className,
      )}
      style={{
        backgroundColor: color ? `${color}22` : undefined,
        color: color ?? undefined,
      }}
    >
      {children}
    </span>
  );
}
