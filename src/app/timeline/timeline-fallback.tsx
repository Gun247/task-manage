"use client";

import { CalendarRange } from "lucide-react";
import { AppShell } from "@/components/app-shell";
import { LoadingCard } from "@/components/ui/loading";

export function TimelinePageFallback() {
  return (
    <AppShell>
      <div className="border-b border-slate-200 bg-white">
        <div className="mx-auto max-w-6xl px-4 py-6 lg:px-8">
          <div className="flex items-start gap-3">
            <span className="mt-0.5 flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10 text-primary">
              <CalendarRange className="h-5 w-5" />
            </span>
            <div>
              <h1 className="text-2xl font-bold text-primary">สรุป Timeline</h1>
              <p className="mt-1 text-sm text-slate-500">
                แสดงเฉพาะวันที่ตั้ง Timeline UAT หรือ PRD ไว้ — จัดกลุ่มรายวันให้อ่านและคัดลอกง่าย
              </p>
            </div>
          </div>
        </div>
      </div>
      <main className="mx-auto w-full max-w-6xl px-4 py-6 lg:px-8">
        <LoadingCard label="กำลังเปิดหน้า..." />
      </main>
    </AppShell>
  );
}
