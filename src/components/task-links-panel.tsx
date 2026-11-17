"use client";

import { useEffect, useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Select } from "@/components/ui/input";
import { LoadingButtonContent } from "@/components/ui/loading";
import type { Task, TaskLink, TaskLinkType } from "@/lib/types";
import { Link2, Trash2 } from "lucide-react";

interface TaskLinksPanelProps {
  task: Task;
  projectTasks: Task[];
}

function linkLabel(link: TaskLink) {
  if (link.linkType === "blocks") {
    return link.direction === "out" ? "บล็อก" : "ถูกบล็อกโดย";
  }
  return "เกี่ยวข้องกับ";
}

export function TaskLinksPanel({ task, projectTasks }: TaskLinksPanelProps) {
  const [links, setLinks] = useState<TaskLink[]>(task.links ?? []);
  const [toTaskId, setToTaskId] = useState("");
  const [linkType, setLinkType] = useState<TaskLinkType>("relates");
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const candidates = useMemo(
    () =>
      projectTasks.filter(
        (item) =>
          item.id !== task.id &&
          !links.some(
            (link) =>
              link.otherTask.id === item.id && link.linkType === linkType,
          ),
      ),
    [projectTasks, task.id, links, linkType],
  );

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    fetch(`/api/tasks/${task.id}/links`)
      .then(async (response) => {
        if (!response.ok) return [];
        return (await response.json()) as TaskLink[];
      })
      .then((rows) => {
        if (!cancelled) setLinks(rows);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [task.id]);

  async function handleAdd() {
    if (!toTaskId || saving) return;
    setSaving(true);
    try {
      const response = await fetch(`/api/tasks/${task.id}/links`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ toTaskId, linkType }),
      });
      if (!response.ok) {
        const data = (await response.json().catch(() => null)) as {
          error?: string;
        } | null;
        window.alert(data?.error ?? "ลิงก์ไม่สำเร็จ");
        return;
      }
      const created = (await response.json()) as TaskLink;
      setLinks((current) => [...current, created]);
      setToTaskId("");
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(linkId: string) {
    if (deletingId) return;
    setDeletingId(linkId);
    try {
      const response = await fetch(`/api/tasks/${task.id}/links/${linkId}`, {
        method: "DELETE",
      });
      if (!response.ok) {
        const data = (await response.json().catch(() => null)) as {
          error?: string;
        } | null;
        window.alert(data?.error ?? "ลบลิงก์ไม่สำเร็จ");
        return;
      }
      setLinks((current) => current.filter((item) => item.id !== linkId));
    } finally {
      setDeletingId(null);
    }
  }

  return (
    <div className="space-y-3">
      {loading ? (
        <p className="text-xs text-slate-500">กำลังโหลด...</p>
      ) : links.length === 0 ? (
        <p className="text-xs text-slate-500">ยังไม่มี linked tasks</p>
      ) : (
        <ul className="space-y-2">
          {links.map((link) => (
            <li
              key={link.id}
              className="flex items-center justify-between gap-2 rounded-lg border border-slate-200 bg-white px-3 py-2"
            >
              <div className="min-w-0">
                <p className="text-xs font-medium text-slate-500">
                  {linkLabel(link)}
                </p>
                <p className="truncate text-sm text-slate-800">
                  {link.otherTask.name}
                  <span className="ml-2 text-xs text-slate-400">
                    {link.otherTask.statusName}
                  </span>
                </p>
              </div>
              <button
                type="button"
                className="shrink-0 rounded p-1 text-slate-400 hover:bg-red-50 hover:text-red-600"
                disabled={deletingId === link.id}
                onClick={() => handleDelete(link.id)}
                aria-label="ลบลิงก์"
              >
                <Trash2 className="h-3.5 w-3.5" />
              </button>
            </li>
          ))}
        </ul>
      )}

      <div className="grid gap-2 sm:grid-cols-[7rem_1fr_auto]">
        <Select
          value={linkType}
          onChange={(event) =>
            setLinkType(event.target.value as TaskLinkType)
          }
        >
          <option value="relates">เกี่ยวข้อง</option>
          <option value="blocks">บล็อก</option>
        </Select>
        <Select
          value={toTaskId}
          onChange={(event) => setToTaskId(event.target.value)}
        >
          <option value="">เลือก task...</option>
          {candidates.map((item) => (
            <option key={item.id} value={item.id}>
              {item.name}
            </option>
          ))}
        </Select>
        <Button
          type="button"
          size="sm"
          disabled={!toTaskId || saving}
          onClick={handleAdd}
        >
          <LoadingButtonContent loading={saving} loadingText="...">
            <Link2 className="h-3.5 w-3.5" />
            ลิงก์
          </LoadingButtonContent>
        </Button>
      </div>
    </div>
  );
}
