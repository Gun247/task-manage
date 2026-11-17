"use client";

import { CalendarRange } from "lucide-react";
import { AppShell } from "@/components/app-shell";
import { PageHeader, PageMain } from "@/components/page-layout";
import { LoadingCard } from "@/components/ui/loading";

export function TimelinePageFallback() {
  return (
    <AppShell>
      <PageHeader
        icon={<CalendarRange className="h-5 w-5" />}
        title="สรุป Timeline"
        description="แสดงเฉพาะวันที่ตั้ง Timeline UAT หรือ PRD ไว้ — จัดกลุ่มรายวันให้อ่านและคัดลอกง่าย"
      />
      <PageMain width="6xl">
        <LoadingCard label="กำลังเปิดหน้า..." />
      </PageMain>
    </AppShell>
  );
}
