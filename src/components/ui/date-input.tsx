"use client";

import { forwardRef } from "react";
import { Input, Label } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { Calendar } from "lucide-react";

interface DateInputProps
  extends Omit<React.InputHTMLAttributes<HTMLInputElement>, "type"> {
  label?: string;
  compact?: boolean;
}

export const DateInput = forwardRef<HTMLInputElement, DateInputProps>(
  function DateInput({ label, compact = false, className, id, ...props }, ref) {
    return (
      <div className="min-w-0">
        {label ? (
          <Label
            htmlFor={id}
            className={cn(
              compact &&
                "mb-1 text-[11px] font-medium tracking-wide text-slate-500 uppercase",
            )}
          >
            {label}
          </Label>
        ) : null}
        <div className="relative">
          <Calendar
            className="pointer-events-none absolute top-1/2 left-2.5 h-3.5 w-3.5 -translate-y-1/2 text-slate-400"
            aria-hidden
          />
          <Input
            ref={ref}
            id={id}
            type="date"
            className={cn(
              "appearance-none bg-white pr-2 pl-8 text-sm text-slate-700",
              compact ? "h-9 py-0 leading-9" : "h-10",
              "[&::-webkit-calendar-picker-indicator]:absolute [&::-webkit-calendar-picker-indicator]:inset-0 [&::-webkit-calendar-picker-indicator]:h-full [&::-webkit-calendar-picker-indicator]:w-full [&::-webkit-calendar-picker-indicator]:cursor-pointer [&::-webkit-calendar-picker-indicator]:opacity-0",
              className,
            )}
            {...props}
          />
        </div>
      </div>
    );
  },
);
