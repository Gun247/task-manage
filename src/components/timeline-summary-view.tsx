"use client";

import {
  memo,
  useCallback,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
} from "react";
import { AssigneesDisplay } from "@/components/assignee-multi-select";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { LinkifiedText } from "@/components/ui/linkified-text";
import type { Task } from "@/lib/types";
import {
  buildTimelineSummaryText,
  formatDayChip,
  formatTimelineHeading,
  relativeDayLabel,
  taskAssignees,
  type TimelineDayGroup,
  type TimelineKind,
} from "@/lib/timeline-summary";
import { cn } from "@/lib/utils";
import { CalendarDays, Check, Copy } from "lucide-react";

interface TimelineSummaryViewProps {
  groups: TimelineDayGroup[];
  onTaskClick?: (task: Task) => void;
}

async function copyText(text: string) {
  try {
    await navigator.clipboard.writeText(text);
  } catch {
    const textarea = document.createElement("textarea");
    textarea.value = text;
    textarea.setAttribute("readonly", "");
    textarea.style.position = "absolute";
    textarea.style.left = "-9999px";
    document.body.appendChild(textarea);
    textarea.select();
    document.execCommand("copy");
    document.body.removeChild(textarea);
  }
}

const TaskRows = memo(function TaskRows({
  tasks,
  kind,
  onTaskClick,
}: {
  tasks: Task[];
  kind: TimelineKind;
  onTaskClick?: (task: Task) => void;
}) {
  const statusLabel = kind === "uat" ? "UAT Status" : "PRD Status";

  return (
    <div className="overflow-x-auto">
      <table className="min-w-full text-left text-sm">
        <thead>
          <tr className="text-caption font-semibold tracking-wide text-slate-500 uppercase">
            <th className="w-10 px-3 py-2">No</th>
            <th className="min-w-[9rem] px-3 py-2">Task</th>
            <th className="min-w-[12rem] px-3 py-2">Subject</th>
            <th className="min-w-[7rem] px-3 py-2">DEV</th>
            <th className="whitespace-nowrap px-3 py-2">{statusLabel}</th>
          </tr>
        </thead>
        <tbody>
          {tasks.map((task, index) => {
            const assignees = taskAssignees(task);
            return (
              <tr
                key={`${kind}-${task.id}`}
                className={cn(
                  "border-t border-slate-100",
                  onTaskClick && "cursor-pointer hover:bg-white/80",
                )}
                onClick={onTaskClick ? () => onTaskClick(task) : undefined}
              >
                <td className="px-3 py-2.5 align-top text-xs text-slate-400">
                  {index + 1}
                </td>
                <td className="px-3 py-2.5 align-top">
                  <p className="font-medium text-slate-900">{task.name}</p>
                  <div className="mt-1 flex flex-wrap items-center gap-1.5">
                    <Badge color={task.priority.color}>
                      {task.priority.label}
                    </Badge>
                  </div>
                </td>
                <td className="px-3 py-2.5 align-top text-xs leading-relaxed text-slate-600">
                  {task.description?.trim() ? (
                    <LinkifiedText text={task.description.trim()} />
                  ) : (
                    <span className="text-slate-400">-</span>
                  )}
                </td>
                <td className="px-3 py-2.5 align-top">
                  {assignees.length > 0 ? (
                    <div className="flex flex-wrap items-center gap-1.5">
                      <AssigneesDisplay assignees={assignees} empty="" max={4} />
                      <span className="text-xs font-medium text-slate-700">
                        {assignees.map((member) => member.nickname).join(", ")}
                      </span>
                    </div>
                  ) : (
                    <span className="text-xs text-slate-400">-</span>
                  )}
                </td>
                <td className="whitespace-nowrap px-3 py-2.5 align-top">
                  <Badge color={task.status.color}>{task.status.name}</Badge>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
});

const KindSection = memo(function KindSection({
  date,
  kind,
  tasks,
  onTaskClick,
  onCopied,
}: {
  date: Date;
  kind: TimelineKind;
  tasks: Task[];
  onTaskClick?: (task: Task) => void;
  onCopied: () => void;
}) {
  if (tasks.length === 0) return null;

  const isUat = kind === "uat";

  async function copySection() {
    await copyText(
      buildTimelineSummaryText([
        {
          dateKey: "",
          date,
          uatTasks: isUat ? tasks : [],
          prdTasks: isUat ? [] : tasks,
        },
      ]),
    );
    onCopied();
  }

  return (
    <section
      className={cn(
        "overflow-hidden rounded-xl border",
        isUat
          ? "border-amber-200 bg-amber-50/70"
          : "border-emerald-200 bg-emerald-50/70",
      )}
    >
      <div
        className={cn(
          "flex items-center justify-between gap-2 px-3 py-2",
          isUat ? "bg-amber-100/80" : "bg-emerald-100/80",
        )}
      >
        <div className="flex min-w-0 items-center gap-2">
          <span
            className={cn(
              "rounded-full px-2 py-0.5 text-micro font-bold tracking-wide text-white",
              isUat ? "bg-amber-500" : "bg-emerald-500",
            )}
          >
            {isUat ? "UAT" : "PRD"}
          </span>
          <h3
            className={cn(
              "truncate text-sm font-semibold",
              isUat ? "text-amber-950" : "text-emerald-950",
            )}
          >
            {formatTimelineHeading(date, kind)}
          </h3>
          <span
            className={cn(
              "rounded-full px-2 py-0.5 text-micro font-medium",
              isUat
                ? "bg-amber-200/80 text-amber-800"
                : "bg-emerald-200/80 text-emerald-800",
            )}
          >
            {tasks.length}
          </span>
        </div>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          className="h-7 shrink-0 px-2 text-caption"
          onClick={copySection}
        >
          <Copy className="h-3.5 w-3.5" />
          คัดลอก
        </Button>
      </div>
      <TaskRows tasks={tasks} kind={kind} onTaskClick={onTaskClick} />
    </section>
  );
});

const DayGroupArticle = memo(function DayGroupArticle({
  group,
  onTaskClick,
  onCopied,
}: {
  group: TimelineDayGroup;
  onTaskClick?: (task: Task) => void;
  onCopied: () => void;
}) {
  return (
    <article className="flex min-h-0 flex-1 flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
      <div className="shrink-0 px-4 pt-4 pb-3">
        <p className="text-lg font-semibold text-slate-900">
          {group.date.toLocaleDateString("th-TH", {
            weekday: "long",
            day: "numeric",
            month: "long",
            year: "numeric",
          })}
        </p>
        <p className="text-xs text-slate-500">
          {relativeDayLabel(group.date)}
          {group.uatTasks.length > 0 ? ` · UAT ${group.uatTasks.length}` : ""}
          {group.prdTasks.length > 0 ? ` · PRD ${group.prdTasks.length}` : ""}
        </p>
      </div>

      <div className="min-h-0 flex-1 space-y-3 overflow-y-auto overscroll-contain px-4 pb-4">
        <KindSection
          date={group.date}
          kind="uat"
          tasks={group.uatTasks}
          onTaskClick={onTaskClick}
          onCopied={onCopied}
        />
        <KindSection
          date={group.date}
          kind="prd"
          tasks={group.prdTasks}
          onTaskClick={onTaskClick}
          onCopied={onCopied}
        />
      </div>
    </article>
  );
});

const NAV_ITEM_WIDTH = 112;

function formatFocusDayLabel(date: Date, active: boolean) {
  if (active) return formatDayChip(date);
  return date.toLocaleDateString("th-TH", {
    day: "numeric",
    month: "short",
  });
}

export function TimelineSummaryView({
  groups,
  onTaskClick,
}: TimelineSummaryViewProps) {
  const [copied, setCopied] = useState(false);
  const [activeIndex, setActiveIndex] = useState(0);
  const [navEdgePad, setNavEdgePad] = useState(0);
  const navRef = useRef<HTMLDivElement>(null);
  const isNavDrivingRef = useRef(false);
  const skipNavCenterRef = useRef(false);
  const activeIndexRef = useRef(0);
  const navScrollEndTimer = useRef<number | null>(null);
  const groupsKey = groups.map((group) => group.dateKey).join("|");
  const activeGroup = groups[activeIndex] ?? groups[0] ?? null;

  const markCopied = useCallback(() => {
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1800);
  }, []);

  useEffect(() => {
    activeIndexRef.current = activeIndex;
  }, [activeIndex]);

  useEffect(() => {
    setActiveIndex(0);
    activeIndexRef.current = 0;
  }, [groupsKey]);

  useEffect(() => {
    const nav = navRef.current;
    if (!nav) return;

    const updatePad = () => {
      setNavEdgePad(Math.max(0, (nav.clientWidth - NAV_ITEM_WIDTH) / 2));
    };

    updatePad();
    const observer = new ResizeObserver(updatePad);
    observer.observe(nav);
    return () => observer.disconnect();
  }, [groupsKey]);

  const centerNavOnIndex = useCallback(
    (index: number, behavior: ScrollBehavior = "smooth") => {
      const nav = navRef.current;
      if (!nav || groups.length === 0) return;
      isNavDrivingRef.current = true;
      nav.scrollTo({ left: Math.max(0, index * NAV_ITEM_WIDTH), behavior });
      window.setTimeout(
        () => {
          isNavDrivingRef.current = false;
        },
        behavior === "smooth" ? 420 : 40,
      );
    },
    [groups.length],
  );

  const setActiveFromIndex = useCallback(
    (index: number, options?: { centerNav?: boolean; behavior?: ScrollBehavior }) => {
      const clamped = Math.max(0, Math.min(index, groups.length - 1));
      if (groups.length === 0) return;
      const shouldCenter = options?.centerNav ?? true;
      if (!shouldCenter) skipNavCenterRef.current = true;
      activeIndexRef.current = clamped;
      setActiveIndex(clamped);
      if (shouldCenter) {
        centerNavOnIndex(clamped, options?.behavior ?? "smooth");
      }
    },
    [centerNavOnIndex, groups.length],
  );

  useLayoutEffect(() => {
    if (skipNavCenterRef.current) {
      skipNavCenterRef.current = false;
      return;
    }
    centerNavOnIndex(activeIndex, "smooth");
  }, [activeIndex, centerNavOnIndex, groupsKey]);

  useEffect(() => {
    const nav = navRef.current;
    if (!nav) return;

    const settleActiveFromScroll = () => {
      if (isNavDrivingRef.current || groups.length === 0) return;
      const nextIndex = Math.round(nav.scrollLeft / NAV_ITEM_WIDTH);
      const clamped = Math.max(0, Math.min(nextIndex, groups.length - 1));
      if (clamped === activeIndexRef.current) return;
      skipNavCenterRef.current = true;
      activeIndexRef.current = clamped;
      setActiveIndex(clamped);
    };

    const onNavScroll = () => {
      if (isNavDrivingRef.current) return;
      if (navScrollEndTimer.current !== null) {
        window.clearTimeout(navScrollEndTimer.current);
      }
      // Update focus while dragging, snap label after scroll settles.
      const liveIndex = Math.round(nav.scrollLeft / NAV_ITEM_WIDTH);
      const clamped = Math.max(0, Math.min(liveIndex, groups.length - 1));
      if (clamped !== activeIndexRef.current) {
        skipNavCenterRef.current = true;
        activeIndexRef.current = clamped;
        setActiveIndex(clamped);
      }
      navScrollEndTimer.current = window.setTimeout(() => {
        settleActiveFromScroll();
        if (!isNavDrivingRef.current) {
          centerNavOnIndex(activeIndexRef.current, "smooth");
        }
      }, 90);
    };

    const onWheel = (event: WheelEvent) => {
      if (Math.abs(event.deltaY) <= Math.abs(event.deltaX)) return;
      if (nav.scrollWidth <= nav.clientWidth) return;
      event.preventDefault();
      nav.scrollLeft += event.deltaY;
    };

    const keepActiveAligned = () => {
      centerNavOnIndex(activeIndexRef.current, "auto");
    };

    nav.addEventListener("scroll", onNavScroll, { passive: true });
    nav.addEventListener("wheel", onWheel, { passive: false });
    window.addEventListener("resize", keepActiveAligned);
    return () => {
      if (navScrollEndTimer.current !== null) {
        window.clearTimeout(navScrollEndTimer.current);
      }
      nav.removeEventListener("scroll", onNavScroll);
      nav.removeEventListener("wheel", onWheel);
      window.removeEventListener("resize", keepActiveAligned);
    };
  }, [centerNavOnIndex, groups.length, groupsKey]);

  useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      if (event.defaultPrevented) return;
      const target = event.target as HTMLElement | null;
      if (
        target &&
        (target.tagName === "INPUT" ||
          target.tagName === "TEXTAREA" ||
          target.tagName === "SELECT" ||
          target.isContentEditable)
      ) {
        return;
      }

      if (event.key === "ArrowLeft") {
        event.preventDefault();
        setActiveFromIndex(activeIndex - 1);
      } else if (event.key === "ArrowRight") {
        event.preventDefault();
        setActiveFromIndex(activeIndex + 1);
      }
    }

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [activeIndex, setActiveFromIndex]);

  async function copyAll() {
    await copyText(buildTimelineSummaryText(groups));
    markCopied();
  }

  if (groups.length === 0) {
    return (
      <div className="flex min-h-0 flex-1 items-center justify-center rounded-2xl border border-dashed border-slate-200 bg-white px-6 py-16 text-center">
        <div>
          <CalendarDays className="mx-auto mb-3 h-10 w-10 text-slate-300" />
          <h3 className="text-base font-semibold text-slate-800">
            ยังไม่มีวันที่มี Timeline
          </h3>
          <p className="mt-2 text-sm text-slate-500">
            หน้านี้แสดงเฉพาะวันที่ถูกตั้ง Timeline UAT หรือ Timeline PRD ไว้
          </p>
        </div>
      </div>
    );
  }

  const lineWidth = Math.max(groups.length - 1, 0) * NAV_ITEM_WIDTH;

  return (
    <div className="flex min-h-0 flex-1 flex-col gap-3">
      <div className="flex shrink-0 items-start gap-2 pt-1">
        <div
          ref={navRef}
          className="min-w-0 flex-1 touch-pan-x snap-x snap-mandatory overflow-x-auto overscroll-x-contain [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
          aria-label="เลื่อน timeline เพื่อเลือกวัน"
          role="tablist"
        >
          <div
            className="relative flex w-max items-start"
            style={{ paddingInline: navEdgePad }}
          >
            <div
              aria-hidden
              className="pointer-events-none absolute top-[22px] h-[3px] rounded-full bg-slate-200"
              style={{
                left: navEdgePad + NAV_ITEM_WIDTH / 2,
                width: lineWidth,
              }}
            />
            {groups.map((group, index) => {
              const active = index === activeIndex;
              const distance = Math.abs(index - activeIndex);
              const taskCount = group.uatTasks.length + group.prdTasks.length;
              return (
                <button
                  key={group.dateKey}
                  type="button"
                  role="tab"
                  aria-selected={active}
                  aria-label={`${formatFocusDayLabel(group.date, true)}, ${taskCount} tasks`}
                  onClick={() => setActiveFromIndex(index)}
                  className={cn(
                    "relative z-[1] flex shrink-0 snap-center flex-col items-center px-1 transition-opacity duration-150",
                    active ? "opacity-100" : distance === 1 ? "opacity-90" : "opacity-45",
                  )}
                  style={{ width: NAV_ITEM_WIDTH }}
                >
                  <span className="flex h-[44px] items-center justify-center">
                    <span
                      className={cn(
                        "block rounded-full border-[3px] border-slate-300 bg-white transition-all duration-150",
                        active
                          ? "h-5 w-5 border-primary bg-primary shadow-[0_0_0_5px_color-mix(in_srgb,var(--primary)_20%,transparent)]"
                          : distance === 1
                            ? "h-3.5 w-3.5"
                            : "h-3 w-3",
                      )}
                    />
                  </span>
                  <span
                    className={cn(
                      "block min-h-[2.5rem] text-center leading-tight whitespace-nowrap",
                      active
                        ? "text-sm font-semibold text-primary"
                        : distance === 1
                          ? "text-xs font-medium text-slate-600"
                          : "text-[11px] font-medium text-slate-400",
                    )}
                  >
                    {formatFocusDayLabel(group.date, active)}
                    {active ? (
                      <span className="mt-0.5 block text-[11px] font-medium text-slate-400">
                        {taskCount} tasks
                      </span>
                    ) : null}
                  </span>
                </button>
              );
            })}
          </div>
        </div>

        <Button
          type="button"
          variant="outline"
          size="sm"
          className="mt-2 h-8 shrink-0 gap-1.5"
          onClick={copyAll}
        >
          {copied ? (
            <>
              <Check className="h-3.5 w-3.5 text-primary" />
              <span className="hidden sm:inline">คัดลอกแล้ว</span>
            </>
          ) : (
            <>
              <Copy className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">คัดลอกทั้งหมด</span>
            </>
          )}
        </Button>
      </div>

      {activeGroup ? (
        <DayGroupArticle
          group={activeGroup}
          onTaskClick={onTaskClick}
          onCopied={markCopied}
        />
      ) : null}
    </div>
  );
}
