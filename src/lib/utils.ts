import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatDate(date: Date | string | null | undefined) {
  if (!date) return "-";
  const value = typeof date === "string" ? new Date(date) : date;
  return value.toLocaleDateString("th-TH", {
    day: "2-digit",
    month: "2-digit",
    year: "2-digit",
  });
}
