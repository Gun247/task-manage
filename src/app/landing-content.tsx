"use client";

import Link from "next/link";
import {
  useEffect,
  useEffectEvent,
  useRef,
  useState,
  type CSSProperties,
} from "react";
import { useRouter } from "next/navigation";
import {
  CalendarRange,
  FolderKanban,
  LayoutGrid,
  ListTodo,
  Shield,
} from "lucide-react";
import { readMemberSession } from "@/lib/current-member";
import {
  ROLE_DESCRIPTIONS,
  ROLE_LABELS,
  ROLE_PERMISSION_MATRIX,
  type MemberRole,
} from "@/lib/roles";
import { cn } from "@/lib/utils";

const DEMO_TASKS = [
  {
    name: "ตั้งค่า WIP บน Kanban",
    priority: "P0" as const,
    status: "In Progress",
    statusColor: "#3B82F6",
    nick: "Gun",
    color: "#DC2626",
  },
  {
    name: "เพิ่ม Saved Filter ของทีม",
    priority: "P1" as const,
    status: "Backlog",
    statusColor: "#6B7280",
    nick: "Fame",
    color: "#374151",
  },
  {
    name: "ทบทวน Timeline UAT / PRD",
    priority: "P1" as const,
    status: "UAT",
    statusColor: "#F97316",
    nick: "Mind",
    color: "#0EA5E9",
  },
  {
    name: "เขียน Activity comment บน task",
    priority: "P2" as const,
    status: "Done",
    statusColor: "#6BB82A",
    nick: "Junior",
    color: "#8B5CF6",
  },
];

const DEMO_COLUMNS = [
  {
    id: "backlog",
    title: "Backlog",
    color: "#6B7280",
    cards: DEMO_TASKS.filter((t) => t.status === "Backlog"),
  },
  {
    id: "progress",
    title: "In Progress",
    color: "#3B82F6",
    cards: DEMO_TASKS.filter((t) => t.status === "In Progress"),
  },
  {
    id: "done",
    title: "Done",
    color: "#6BB82A",
    cards: DEMO_TASKS.filter((t) => t.status === "Done" || t.status === "UAT"),
  },
];

const SCROLL_FEATURES = [
  {
    id: "list",
    title: "List",
    line: "ตารางงานที่คุ้นมือ",
    body: "ค้นหาและกรอง priority / assignee / type ได้ทันที มี view switcher สลับไป Kanban หรือปฏิทินโดยไม่เสียบริบท",
    icon: ListTodo,
    visual: "list" as const,
  },
  {
    id: "kanban",
    title: "Kanban",
    line: "ลากแล้วสถานะเปลี่ยน",
    body: "คอลัมน์ตาม Status จริง ลากการ์ดข้ามคอลัมน์ได้ทันที และตั้ง WIP limit ได้ใน Settings",
    icon: LayoutGrid,
    visual: "kanban" as const,
  },
  {
    id: "calendar",
    title: "Calendar",
    line: "เห็นงานตามวันที่",
    body: "วางงานตาม start–end, UAT, PRD เปิด panel รายวันเพื่อดูรายการในวันนั้น",
    icon: CalendarRange,
    visual: "calendar" as const,
  },
  {
    id: "roles",
    title: "Roles",
    line: "สิทธิ์ชัดแบบทีม",
    body: "Viewer / Member / Administrator — Admin เพิ่มเลขพนักงาน แล้วเข้าได้ตาม Role ที่กำหนด",
    icon: Shield,
    visual: "roles" as const,
  },
];

function PriorityChip({ priority }: { priority: "P0" | "P1" | "P2" }) {
  return (
    <span
      className={cn(
        "inline-flex h-5 min-w-5 items-center justify-center rounded px-1 text-[10px] font-bold text-white",
        priority === "P0" && "bg-[#EF4444]",
        priority === "P1" && "bg-[#F97316]",
        priority === "P2" && "bg-[#6B7280]",
      )}
    >
      {priority}
    </span>
  );
}

function ViewSwitcherMock({ active }: { active: "list" | "kanban" | "calendar" }) {
  const items = [
    { id: "list", label: "รายการ" },
    { id: "kanban", label: "Kanban" },
    { id: "calendar", label: "ปฏิทิน" },
  ] as const;
  return (
    <div className="inline-flex rounded-lg bg-slate-100 p-0.5 text-[11px] font-medium text-slate-500">
      {items.map((item) => (
        <span
          key={item.id}
          className={cn(
            "rounded-md px-2.5 py-1",
            item.id === active && "bg-white text-primary shadow-sm",
          )}
        >
          {item.label}
        </span>
      ))}
    </div>
  );
}

function clamp01(value: number) {
  return Math.min(1, Math.max(0, value));
}

function FeatureVisual({
  kind,
  phase,
}: {
  kind: (typeof SCROLL_FEATURES)[number]["visual"];
  phase: number;
}) {
  const p = clamp01(phase);

  if (kind === "list") {
    const filterOn = p > 0.2;
    return (
      <div
        className="overflow-hidden rounded-2xl border border-[#B8D4E8]/80 bg-white shadow-[0_12px_40px_rgba(30,58,47,0.08)]"
        style={{
          transform: `translate3d(0, ${(1 - p) * 24}px, 0) scale(${0.97 + p * 0.03})`,
        }}
      >
        <div className="flex flex-wrap items-center gap-2 border-b border-slate-100 px-3 py-2.5">
          <ViewSwitcherMock active="list" />
          <div
            className={cn(
              "h-8 min-w-[8rem] flex-1 rounded-lg border px-2.5 text-[11px] leading-8 transition-colors",
              filterOn
                ? "border-primary/40 bg-primary/5 text-slate-700"
                : "border-slate-200 bg-slate-50 text-slate-400",
            )}
          >
            {filterOn ? "WIP" : "ค้นหางาน..."}
          </div>
          <span
            className={cn(
              "rounded-lg border px-2 py-1.5 text-[11px] transition-colors",
              p > 0.35
                ? "border-primary bg-primary text-white"
                : "border-slate-200 text-slate-500",
            )}
          >
            Priority
          </span>
          <span
            className={cn(
              "rounded-lg border px-2 py-1.5 text-[11px] transition-colors",
              p > 0.55
                ? "border-primary bg-primary text-white"
                : "border-slate-200 text-slate-500",
            )}
          >
            Assignee
          </span>
        </div>
        <div className="grid grid-cols-[minmax(0,1.6fr)_auto_auto_auto] gap-3 border-b border-slate-100 bg-slate-50 px-4 py-2 text-[11px] font-semibold text-slate-500">
          <span>ชื่องาน</span>
          <span>Priority</span>
          <span>Status</span>
          <span>Assignee</span>
        </div>
        {DEMO_TASKS.map((task, index) => {
          const reveal = clamp01((p - index * 0.12) / 0.28);
          return (
            <div
              key={task.name}
              className="grid grid-cols-[minmax(0,1.6fr)_auto_auto_auto] items-center gap-3 border-b border-slate-50 px-4 py-3 last:border-0"
              style={{
                opacity: 0.25 + reveal * 0.75,
                transform: `translate3d(${(1 - reveal) * 18}px, 0, 0)`,
              }}
            >
              <span className="truncate text-sm font-medium text-slate-800">
                {task.name}
              </span>
              <PriorityChip priority={task.priority} />
              <span
                className="rounded-full px-2 py-0.5 text-[10px] font-semibold text-white"
                style={{ backgroundColor: task.statusColor }}
              >
                {task.status}
              </span>
              <span className="inline-flex items-center gap-1.5 text-xs text-slate-600">
                <span
                  className="h-5 w-5 rounded-full text-center text-[9px] font-bold leading-5 text-white"
                  style={{ backgroundColor: task.color }}
                >
                  {task.nick.slice(0, 1)}
                </span>
                {task.nick}
              </span>
            </div>
          );
        })}
      </div>
    );
  }

  if (kind === "kanban") {
    const drag = clamp01((p - 0.15) / 0.7);
    return (
      <div className="space-y-3">
        <div className="flex items-center justify-between gap-3">
          <ViewSwitcherMock active="kanban" />
          <span
            className={cn(
              "rounded-full px-2.5 py-1 text-[11px] font-medium transition-colors",
              p > 0.55
                ? "bg-amber-100 text-amber-800"
                : "bg-slate-100 text-slate-500",
            )}
          >
            WIP In Progress: {p > 0.55 ? "3 / 3" : "2 / 3"}
          </span>
        </div>
        <div className="relative grid grid-cols-3 gap-2 sm:gap-3">
          {DEMO_COLUMNS.map((column) => (
            <div
              key={column.id}
              className="overflow-hidden rounded-xl border border-[#B8D4E8]/70 bg-white shadow-sm"
            >
              <div
                className="flex items-center justify-between px-2.5 py-2 text-[11px] font-semibold text-white"
                style={{ backgroundColor: column.color }}
              >
                <span>{column.title}</span>
                <span className="rounded-full bg-white/20 px-1.5">
                  {column.id === "progress" && p > 0.55
                    ? column.cards.length + 1
                    : column.cards.length || 1}
                </span>
              </div>
              <div className="min-h-[8.5rem] space-y-2 p-2">
                {(column.cards.length ? column.cards : [DEMO_TASKS[1]]).map(
                  (card) => (
                    <article
                      key={`${column.id}-${card.name}`}
                      className="rounded-lg border border-slate-100 bg-white px-2 py-2 shadow-sm"
                    >
                      <div className="mb-1.5">
                        <PriorityChip priority={card.priority} />
                      </div>
                      <p className="text-[11px] font-medium leading-snug text-slate-800">
                        {card.name}
                      </p>
                    </article>
                  ),
                )}
                {column.id === "progress" ? (
                  <p
                    className="rounded-lg border border-dashed border-primary/40 bg-primary/5 px-2 py-2 text-center text-[10px] font-medium text-primary"
                    style={{ opacity: 0.35 + drag * 0.65 }}
                  >
                    ลากการ์ดมาวางที่นี่
                  </p>
                ) : null}
              </div>
            </div>
          ))}
          <article
            className="pointer-events-none absolute top-14 z-10 w-[calc((100%-1rem)/3)] rounded-lg border border-primary/30 bg-white px-2 py-2 shadow-[0_10px_30px_rgba(30,58,47,0.18)] sm:w-[calc((100%-1.5rem)/3)]"
            style={{
              left: `calc(${drag * 33.333}% + ${drag * 0.25}rem)`,
              transform: `rotate(${-4 + drag * 4}deg) scale(${1.02 + drag * 0.04})`,
              opacity: p < 0.08 ? 0 : 1,
            }}
          >
            <PriorityChip priority="P1" />
            <p className="mt-1.5 text-[11px] font-medium leading-snug text-slate-800">
              เพิ่ม Saved Filter ของทีม
            </p>
            <p className="mt-1 text-[10px] text-primary">กำลังย้ายสถานะ...</p>
          </article>
        </div>
      </div>
    );
  }

  if (kind === "calendar") {
    const days = Array.from({ length: 35 }, (_, i) => i + 1);
    const rangeEnd = 12 + Math.round(clamp01((p - 0.1) / 0.45) * 1);
    const showPrd = p > 0.55;
    const panel = clamp01((p - 0.35) / 0.4);
    return (
      <div
        className="overflow-hidden rounded-2xl border border-[#B8D4E8]/80 bg-white shadow-[0_12px_40px_rgba(30,58,47,0.08)]"
        style={{
          transform: `translate3d(0, ${(1 - p) * 20}px, 0)`,
        }}
      >
        <div className="flex items-center justify-between border-b border-slate-100 px-4 py-3">
          <div>
            <ViewSwitcherMock active="calendar" />
            <p className="mt-2 text-sm font-semibold text-slate-800">
              มีนาคม 2026
            </p>
          </div>
          <div className="hidden text-right text-[11px] text-slate-500 sm:block">
            <p>UAT 12–{rangeEnd}</p>
            <p style={{ opacity: showPrd ? 1 : 0.35 }}>PRD 18</p>
          </div>
        </div>
        <div className="grid gap-0 lg:grid-cols-[1.3fr_0.9fr]">
          <div className="grid grid-cols-7 gap-1 p-3">
            {["จ", "อ", "พ", "พฤ", "ศ", "ส", "อา"].map((d) => (
              <div
                key={d}
                className="text-center text-[10px] font-semibold text-slate-400"
              >
                {d}
              </div>
            ))}
            {days.map((day) => {
              const inRange = day >= 12 && day <= rangeEnd;
              const prd = showPrd && day === 18;
              return (
                <div
                  key={day}
                  className={cn(
                    "min-h-10 rounded-lg p-1 text-[11px] transition-colors",
                    inRange && "bg-orange-50",
                    prd && "bg-primary/10",
                    !inRange && !prd && "bg-slate-50/80",
                  )}
                >
                  <span className="font-medium text-slate-600">
                    {day <= 31 ? day : ""}
                  </span>
                  {day === 12 && p > 0.12 ? (
                    <span className="mt-0.5 block truncate rounded bg-orange-400/90 px-1 text-[8px] text-white">
                      UAT
                    </span>
                  ) : null}
                  {prd ? (
                    <span className="mt-0.5 block truncate rounded bg-primary px-1 text-[8px] text-white">
                      PRD
                    </span>
                  ) : null}
                </div>
              );
            })}
          </div>
          <div
            className="border-t border-slate-100 p-3 lg:border-l lg:border-t-0"
            style={{
              opacity: 0.2 + panel * 0.8,
              transform: `translate3d(${(1 - panel) * 16}px, 0, 0)`,
            }}
          >
            <p className="text-xs font-semibold text-slate-800">
              งานวันที่ 12 มี.ค.
            </p>
            <ul className="mt-2 space-y-2">
              {DEMO_TASKS.slice(0, 3).map((task, index) => {
                const row = clamp01((panel - index * 0.15) / 0.35);
                return (
                  <li
                    key={task.name}
                    className="rounded-xl border border-slate-100 px-3 py-2"
                    style={{
                      opacity: 0.2 + row * 0.8,
                      transform: `translate3d(0, ${(1 - row) * 10}px, 0)`,
                    }}
                  >
                    <PriorityChip priority={task.priority} />
                    <p className="mt-1 text-xs font-medium text-slate-800">
                      {task.name}
                    </p>
                  </li>
                );
              })}
            </ul>
          </div>
        </div>
      </div>
    );
  }

  const roles = Object.keys(ROLE_LABELS) as MemberRole[];
  return (
    <div
      className="overflow-hidden rounded-2xl border border-[#B8D4E8]/80 bg-white shadow-[0_12px_40px_rgba(30,58,47,0.08)]"
      style={{ transform: `translate3d(0, ${(1 - p) * 18}px, 0)` }}
    >
      <div className="border-b border-slate-100 px-4 py-3">
        <p className="text-sm font-semibold text-slate-800">สิทธิตาม Role</p>
        <p className="mt-0.5 text-xs text-slate-500">
          กำหนดโดย Admin — ไม่ต้องเลือกตอนเข้าสู่ระบบ
        </p>
      </div>
      <div className="grid gap-3 p-4 sm:grid-cols-3">
        {roles.map((role, index) => {
          const on = clamp01((p - index * 0.18) / 0.3);
          return (
            <div
              key={role}
              className="rounded-xl bg-slate-50 px-3 py-3 ring-1 ring-transparent"
              style={{
                opacity: 0.35 + on * 0.65,
                transform: `translate3d(0, ${(1 - on) * 14}px, 0)`,
                boxShadow:
                  on > 0.85
                    ? "0 0 0 1px color-mix(in srgb, var(--primary) 35%, transparent)"
                    : undefined,
              }}
            >
              <p className="text-sm font-semibold text-slate-800">
                {ROLE_LABELS[role]}
              </p>
              <p className="mt-1 text-[11px] leading-relaxed text-slate-500">
                {ROLE_DESCRIPTIONS[role]}
              </p>
            </div>
          );
        })}
      </div>
      <div className="overflow-x-auto border-t border-slate-100 px-4 py-3">
        <table className="w-full min-w-[18rem] text-left text-[11px]">
          <thead>
            <tr className="text-slate-500">
              <th className="py-1.5 pr-2 font-medium">สิทธิ</th>
              <th className="px-1 py-1.5 font-medium">V</th>
              <th className="px-1 py-1.5 font-medium">M</th>
              <th className="px-1 py-1.5 font-medium">A</th>
            </tr>
          </thead>
          <tbody>
            {ROLE_PERMISSION_MATRIX.map((row, index) => {
              const on = clamp01((p - 0.25 - index * 0.08) / 0.25);
              return (
                <tr
                  key={row.label}
                  className="border-t border-slate-50"
                  style={{
                    opacity: 0.25 + on * 0.75,
                    backgroundColor:
                      on > 0.7
                        ? "color-mix(in srgb, var(--primary) 8%, white)"
                        : undefined,
                  }}
                >
                  <td className="py-1.5 pr-2 text-slate-700">{row.label}</td>
                  <td className="px-1 py-1.5 text-slate-600">
                    {row.viewer ? "✓" : "—"}
                  </td>
                  <td className="px-1 py-1.5 text-slate-600">
                    {row.member ? "✓" : "—"}
                  </td>
                  <td className="px-1 py-1.5 text-slate-600">
                    {row.administrator ? "✓" : "—"}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function ScrollFeatureStory() {
  const trackRef = useRef<HTMLDivElement>(null);
  const [progress, setProgress] = useState(0);
  const [reduceMotion, setReduceMotion] = useState(false);
  const count = SCROLL_FEATURES.length;

  const onScroll = useEffectEvent(() => {
    const track = trackRef.current;
    if (!track) return;
    const rect = track.getBoundingClientRect();
    const total = track.offsetHeight - window.innerHeight;
    if (total <= 0) {
      setProgress(0);
      return;
    }
    setProgress(clamp01(-rect.top / total));
  });

  useEffect(() => {
    const media = window.matchMedia("(prefers-reduced-motion: reduce)");
    setReduceMotion(media.matches);
    const onChange = () => setReduceMotion(media.matches);
    media.addEventListener("change", onChange);
    return () => media.removeEventListener("change", onChange);
  }, []);

  useEffect(() => {
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll);
    return () => {
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onScroll);
    };
  }, [onScroll]);

  const scaled = progress * count;
  const active = Math.min(count - 1, Math.max(0, Math.floor(scaled)));
  const phase = reduceMotion ? 1 : scaled - active;
  const feature = SCROLL_FEATURES[active];
  const Icon = feature.icon;

  return (
    <section
      ref={trackRef}
      aria-label="ฟีเจอร์"
      className="relative"
      style={{ height: `${count * 140}vh` } as CSSProperties}
    >
      <div className="sticky top-0 flex h-svh flex-col justify-center overflow-hidden bg-[linear-gradient(180deg,#F7FBFE_0%,#EEF7E8_100%)]">
        <div className="mx-auto grid w-full max-w-6xl flex-1 items-center gap-10 px-4 py-10 sm:px-6 lg:grid-cols-[0.9fr_1.1fr] lg:gap-14 lg:px-8">
          <div
            style={{
              transform: reduceMotion
                ? undefined
                : `translate3d(0, ${(0.5 - phase) * 12}px, 0)`,
            }}
          >
            <p className="inline-flex items-center gap-2 text-primary">
              <Icon className="h-5 w-5" aria-hidden />
              <span className="text-sm font-semibold tracking-tight">
                {feature.title}
              </span>
            </p>
            <h2 className="mt-3 max-w-[12ch] text-[clamp(2rem,4.5vw,3.5rem)] font-bold leading-[1.05] tracking-[-0.03em] text-[#1E3A2F]">
              {feature.line}
            </h2>
            <p className="mt-4 max-w-md text-base leading-relaxed text-slate-600">
              {feature.body}
            </p>
            <ol className="mt-6 flex flex-wrap gap-2" aria-label="ลำดับฟีเจอร์">
              {SCROLL_FEATURES.map((item, index) => (
                <li key={item.id}>
                  <span
                    className={cn(
                      "inline-flex h-8 items-center rounded-full px-3 text-xs font-medium",
                      index === active
                        ? "bg-primary text-white"
                        : "bg-white text-slate-500 ring-1 ring-slate-200",
                    )}
                  >
                    {item.title}
                  </span>
                </li>
              ))}
            </ol>
          </div>

          <div className="min-h-[18rem] sm:min-h-[22rem]">
            <FeatureVisual kind={feature.visual} phase={phase} />
          </div>
        </div>

        <div className="mx-auto mb-8 w-full max-w-6xl px-4 sm:px-6 lg:px-8">
          <div className="h-1 overflow-hidden rounded-full bg-slate-200/80">
            <div
              className="h-full rounded-full bg-primary"
              style={{ width: `${progress * 100}%` }}
            />
          </div>
          <p className="mt-2 text-[11px] text-slate-500">
            เลื่อนเพื่อดูฟีเจอร์ · {active + 1}/{count}
          </p>
        </div>
      </div>
    </section>
  );
}

export function LandingContent() {
  const router = useRouter();

  useEffect(() => {
    if (readMemberSession()) {
      router.replace("/dashboard");
    }
  }, [router]);

  return (
    <div className="bg-[linear-gradient(180deg,#E8F4FC_0%,#F7FBFE_40%,#EEF7E8_100%)] text-[var(--foreground,#1E3A2F)]">
      <header className="mx-auto flex w-full max-w-6xl items-center justify-between gap-4 px-4 pt-6 sm:px-6 lg:px-8">
        <div className="flex items-center gap-3">
          <span className="flex h-11 w-11 items-center justify-center rounded-full bg-[#354251] text-white shadow-sm">
            <FolderKanban className="h-5 w-5" aria-hidden />
          </span>
          <h1 className="text-[1.5rem] font-bold leading-none tracking-[-0.02em] text-[#2e3c4d]">
            TIM TaskManage
          </h1>
        </div>
        <Link
          href="/signin"
          className="inline-flex h-10 items-center justify-center rounded-xl bg-primary px-4 text-sm font-semibold text-white transition hover:bg-primary-dark focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40"
        >
          เข้าสู่ระบบ
        </Link>
      </header>

      <section className="mx-auto w-full max-w-6xl px-4 pb-8 pt-8 sm:px-6 lg:px-8">
        <p className="max-w-2xl text-[clamp(1.75rem,3.5vw,2.75rem)] font-bold leading-[1.15] tracking-[-0.03em] text-[#1E3A2F]">
          งานของทีม ในมุมมองเดียวที่เลื่อนแล้วเข้าใจ
        </p>
        <p className="mt-3 max-w-xl text-base leading-relaxed text-slate-600">
          แทน spreadsheet ด้วย List, Kanban และ Calendar จากข้อมูลชุดเดียว
          ใครที่ Admin เพิ่มเลขพนักงาน เข้าใช้งานได้ตาม Role
        </p>
      </section>

      <section
        aria-label="ตัวอย่าง Kanban"
        className="mx-auto grid w-full max-w-6xl grid-cols-1 gap-4 px-4 pb-6 sm:px-6 md:grid-cols-3 lg:px-8"
      >
        {DEMO_COLUMNS.map((column) => (
          <div
            key={column.id}
            className="flex min-h-0 flex-col overflow-hidden rounded-2xl border border-[#B8D4E8]/70 bg-white shadow-[0_8px_24px_rgba(30,58,47,0.06)]"
          >
            <div
              className="px-4 py-3 text-sm font-semibold text-white"
              style={{ backgroundColor: column.color }}
            >
              {column.title}
            </div>
            <div className="flex flex-1 flex-col gap-3 p-3">
              {(column.cards.length ? column.cards : [DEMO_TASKS[0]]).map(
                (card) => (
                  <article
                    key={`${column.id}-${card.name}`}
                    className="rounded-xl border border-slate-200/80 bg-white px-3 py-2.5 shadow-sm"
                  >
                    <div className="flex items-start gap-2">
                      <PriorityChip priority={card.priority} />
                      <div className="min-w-0">
                        <p className="text-sm font-medium text-slate-800">
                          {card.name}
                        </p>
                        <p className="mt-1 inline-flex items-center gap-1.5 text-xs text-slate-500">
                          <span
                            className="h-4 w-4 rounded-full"
                            style={{ backgroundColor: card.color }}
                          />
                          {card.nick}
                        </p>
                      </div>
                    </div>
                  </article>
                ),
              )}
              {column.id === "done" ? (
                <div className="mt-auto pt-2">
                  <Link
                    href="/signin"
                    className="flex h-12 w-full items-center justify-center rounded-xl bg-primary text-sm font-semibold text-white shadow-[0_6px_16px_rgba(107,184,42,0.35)] transition hover:bg-primary-dark focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40"
                  >
                    เข้าสู่ระบบ
                  </Link>
                  <p className="mt-2 text-center text-[11px] leading-relaxed text-slate-500">
                    ใช้ได้เมื่อ Admin เพิ่มเลขพนักงานในโปรเจกต์
                  </p>
                </div>
              ) : null}
            </div>
          </div>
        ))}
      </section>

      <p className="mx-auto max-w-6xl px-4 text-center text-[11px] text-slate-500 sm:px-6 md:text-left lg:px-8">
        ข้อมูลตัวอย่างเพื่อสาธิต — ไม่ใช่ task จริงของโปรเจกต์
      </p>

      <div className="mt-10 border-t border-[#B8D4E8]/50">
        <ScrollFeatureStory />
      </div>

      <section className="mx-auto w-full max-w-6xl px-4 py-20 sm:px-6 lg:px-8">
        <h2 className="text-[clamp(1.75rem,3vw,2.5rem)] font-bold tracking-[-0.03em] text-[#1E3A2F]">
          พร้อมเข้างานเมื่อมีเลขพนักงาน
        </h2>
        <p className="mt-3 max-w-2xl text-base leading-relaxed text-slate-600">
          Administrator เพิ่มสมาชิกใน Settings → ทีม แล้วระบุเลขพนักงาน —
          จากนั้นเข้าสู่ระบบได้ทันทีตาม Role
        </p>
        <Link
          href="/signin"
          className="mt-8 inline-flex h-12 items-center justify-center rounded-xl bg-primary px-7 text-sm font-semibold text-white shadow-[0_6px_16px_rgba(107,184,42,0.35)] transition hover:bg-primary-dark focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40"
        >
          ไปหน้าเข้าสู่ระบบ
        </Link>
      </section>
    </div>
  );
}
