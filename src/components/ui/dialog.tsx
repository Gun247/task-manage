"use client";

import { useCallback, useRef } from "react";
import * as DialogPrimitive from "@radix-ui/react-dialog";
import { X } from "lucide-react";
import { cn } from "@/lib/utils";

function assignRef<T>(ref: React.Ref<T> | undefined, value: T | null) {
  if (typeof ref === "function") ref(value);
  else if (ref) ref.current = value;
}

/** Radix unmounts only after animationend. This releases the layer if that event never arrives. */
function useExitFallback(animationName: string, fallbackMs: number) {
  const timerRef = useRef<number | null>(null);
  const observerRef = useRef<MutationObserver | null>(null);

  return useCallback(
    (node: HTMLElement | null) => {
      observerRef.current?.disconnect();
      observerRef.current = null;
      if (timerRef.current !== null) {
        window.clearTimeout(timerRef.current);
        timerRef.current = null;
      }
      if (!node) return;

      const schedule = () => {
        if (node.getAttribute("data-state") !== "closed") return;
        if (timerRef.current !== null) window.clearTimeout(timerRef.current);
        const delay = window.matchMedia("(prefers-reduced-motion: reduce)")
          .matches
          ? 40
          : fallbackMs;
        timerRef.current = window.setTimeout(() => {
          timerRef.current = null;
          if (!node.isConnected || node.getAttribute("data-state") !== "closed") {
            return;
          }
          node.dispatchEvent(
            new AnimationEvent("animationend", { animationName }),
          );
        }, delay);
      };

      const observer = new MutationObserver(schedule);
      observer.observe(node, {
        attributes: true,
        attributeFilter: ["data-state"],
      });
      observerRef.current = observer;
    },
    [animationName, fallbackMs],
  );
}

function SheetOverlay({
  ref,
  ...props
}: React.ComponentProps<typeof DialogPrimitive.Overlay>) {
  const exitRef = useExitFallback("overlay-out", 320);
  return (
    <DialogPrimitive.Overlay
      {...props}
      ref={(node) => {
        exitRef(node);
        assignRef(ref, node);
      }}
    />
  );
}

function SheetFrame({
  ref,
  ...props
}: React.ComponentProps<typeof DialogPrimitive.Content>) {
  const exitRef = useExitFallback("sheet-out", 480);
  return (
    <DialogPrimitive.Content
      {...props}
      ref={(node) => {
        exitRef(node);
        assignRef(ref, node);
      }}
    />
  );
}

export const Dialog = DialogPrimitive.Root;
export const DialogTrigger = DialogPrimitive.Trigger;
export const DialogClose = DialogPrimitive.Close;
export const DialogPortal = DialogPrimitive.Portal;

export function DialogOverlay({
  className,
  ...props
}: React.ComponentProps<typeof DialogPrimitive.Overlay>) {
  return (
    <DialogPrimitive.Overlay
      className={cn(
        "fixed inset-0 z-50 bg-black/40 data-[state=open]:animate-in data-[state=closed]:animate-out",
        className,
      )}
      {...props}
    />
  );
}

export function DialogContent({
  className,
  children,
  variant = "center",
  ...props
}: React.ComponentProps<typeof DialogPrimitive.Content> & {
  variant?: "center" | "sheet";
}) {
  if (variant === "sheet") {
    return (
      <DialogPortal>
        <SheetOverlay
          className={cn(
            "sheet-overlay bg-slate-900/25",
            "data-[state=open]:animate-[overlay-in_280ms_ease-out_both]",
            "data-[state=closed]:animate-[overlay-out_240ms_ease-in_both]",
          )}
        />
        <SheetFrame
          className={cn(
            "sheet-panel fixed inset-y-3 right-3 z-50 flex w-[min(32rem,calc(100vw-1.5rem))] flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-[0_24px_60px_-24px_rgba(15,23,42,0.45)] will-change-transform",
            "data-[state=open]:animate-[sheet-in_520ms_cubic-bezier(0.22,1,0.36,1)_both]",
            "data-[state=closed]:animate-[sheet-out_420ms_cubic-bezier(0.4,0,1,1)_both]",
            className,
          )}
          {...props}
        >
          {children}
          <DialogPrimitive.Close className="absolute top-3.5 right-3.5 z-10 rounded-md p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-600">
            <X className="h-4 w-4" />
          </DialogPrimitive.Close>
        </SheetFrame>
      </DialogPortal>
    );
  }

  return (
    <DialogPortal>
      <DialogOverlay />
      <DialogPrimitive.Content
        className={cn(
          "fixed left-1/2 top-1/2 z-50 w-full max-w-lg -translate-x-1/2 -translate-y-1/2 rounded-2xl border border-slate-200 bg-white p-6 shadow-xl",
          className,
        )}
        {...props}
      >
        {children}
        <DialogPrimitive.Close className="absolute right-4 top-4 rounded-md p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-600">
          <X className="h-4 w-4" />
        </DialogPrimitive.Close>
      </DialogPrimitive.Content>
    </DialogPortal>
  );
}

export function DialogHeader({
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div className={cn("mb-4 flex flex-col gap-1", className)} {...props} />
  );
}

export function DialogTitle({
  className,
  ...props
}: React.ComponentProps<typeof DialogPrimitive.Title>) {
  return (
    <DialogPrimitive.Title
      className={cn("text-lg font-semibold text-primary", className)}
      {...props}
    />
  );
}

export function DialogDescription({
  className,
  ...props
}: React.ComponentProps<typeof DialogPrimitive.Description>) {
  return (
    <DialogPrimitive.Description
      className={cn("text-sm text-slate-500", className)}
      {...props}
    />
  );
}
