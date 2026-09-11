"use client";

import { useState } from "react";
import { AssigneesDisplay } from "@/components/assignee-multi-select";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { TagsDisplay } from "@/components/tag-multi-select";
import type { TagOption, Task } from "@/lib/types";
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
  tags?: TagOption[];
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

function TaskRows({
  tasks,
  kind,
  tags,
  onTaskClick,
}: {
  tasks: Task[];
  kind: TimelineKind;
  tags?: TagOption[];
  onTaskClick?: (task: Task) => void;
}) {
  const statusLabel = kind === "uat" ? "UAT Status" : "PRD Status";

  return (
    <div className="overflow-x-auto">
      <table className="min-w-full text-left text-sm">
        <thead>
          <tr className="text-[11px] font-semibold tracking-wide text-slate-500 uppercase">
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
                    {(task.tags?.length ?? 0) > 0 ? (
                      <TagsDisplay tags={task.tags} options={tags} empty="" />
                    ) : null}
                  </div>
                </td>
                <td className="px-3 py-2.5 align-top text-xs leading-relaxed text-slate-600">
                  {task.description?.trim() || (
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
}

function KindSection({
  date,
  kind,
  tasks,
  tags,
  onTaskClick,
  onCopied,
}: {
  date: Date;
  kind: TimelineKind;
  tasks: Task[];
  tags?: TagOption[];
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
              "rounded-full px-2 py-0.5 text-[10px] font-bold tracking-wide text-white",
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
              "rounded-full px-2 py-0.5 text-[10px] font-medium",
              isUat ? "bg-amber-200/80 text-amber-800" : "bg-emerald-200/80 text-emerald-800",
            )}
          >
            {tasks.length}
          </span>
        </div>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          className="h-7 shrink-0 px-2 text-[11px]"
          onClick={copySection}
        >
          <Copy className="h-3.5 w-3.5" />
          คัดลอก
        </Button>
      </div>
      <TaskRows tasks={tasks} kind={kind} tags={tags} onTaskClick={onTaskClick} />
    </section>
  );
}

export function TimelineSummaryView({
  groups,
  tags = [],
  onTaskClick,
}: TimelineSummaryViewProps) {
  const [copied, setCopied] = useState(false);

  function markCopied() {
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1800);
  }

  async function copyAll() {
    await copyText(buildTimelineSummaryText(groups));
    markCopied();
  }

  function jumpToDay(dateKey: string) {
    document
      .getElementById(`timeline-day-${dateKey}`)
      ?.scrollIntoView({ behavior: "smooth", block: "start" });
  }

  if (groups.length === 0) {
    return (
      <div className="rounded-2xl border border-dashed border-slate-200 bg-white px-6 py-16 text-center">
        <CalendarDays className="mx-auto mb-3 h-10 w-10 text-slate-300" />
        <h3 className="text-base font-semibold text-slate-800">
          ยังไม่มีวันที่มี Timeline
        </h3>
        <p className="mt-2 text-sm text-slate-500">
          หน้านี้แสดงเฉพาะวันที่ถูกตั้ง Timeline UAT หรือ Timeline PRD ไว้
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex min-w-0 flex-1 flex-wrap gap-1.5">
          {groups.map((group) => (
            <button
              key={group.dateKey}
              type="button"
              onClick={() => jumpToDay(group.dateKey)}
              className="inline-flex items-center gap-1.5 rounded-full border border-slate-200 bg-white px-2.5 py-1 text-[11px] font-medium text-slate-600 transition hover:border-primary/40 hover:text-primary"
            >
              {formatDayChip(group.date)}
              <span className="text-slate-400">
                {group.uatTasks.length + group.prdTasks.length}
              </span>
            </button>
          ))}
        </div>
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="h-8 gap-1.5"
          onClick={copyAll}
        >
          {copied ? (
            <>
              <Check className="h-3.5 w-3.5 text-primary" />
              คัดลอกแล้ว
            </>
          ) : (
            <>
              <Copy className="h-3.5 w-3.5" />
              คัดลอกทั้งหมด
            </>
          )}
        </Button>
      </div>

      {groups.map((group) => (
        <article
          key={group.dateKey}
          id={`timeline-day-${group.dateKey}`}
          className="scroll-mt-4 space-y-3"
        >
          <div className="flex flex-wrap items-end justify-between gap-2 px-0.5">
            <div>
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
                {group.uatTasks.length > 0
                  ? ` · UAT ${group.uatTasks.length}`
                  : ""}
                {group.prdTasks.length > 0
                  ? ` · PRD ${group.prdTasks.length}`
                  : ""}
              </p>
            </div>
          </div>

          <KindSection
            date={group.date}
            kind="uat"
            tasks={group.uatTasks}
            tags={tags}
            onTaskClick={onTaskClick}
            onCopied={markCopied}
          />
          <KindSection
            date={group.date}
            kind="prd"
            tasks={group.prdTasks}
            tags={tags}
            onTaskClick={onTaskClick}
            onCopied={markCopied}
          />
        </article>
      ))}
    </div>
  );
}
