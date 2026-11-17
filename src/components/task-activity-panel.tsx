"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/input";
import { LoadingButtonContent } from "@/components/ui/loading";
import { readCurrentMemberId } from "@/lib/current-member";
import { postReleaseChangeTypeLabel } from "@/lib/post-release-change";
import type { Task, TaskComment } from "@/lib/types";
import { cn, formatDateTime } from "@/lib/utils";
import { History, MessageSquare, Trash2 } from "lucide-react";

type ActivityTab = "comments" | "history" | "postRelease";

interface TaskActivityPanelProps {
  task: Task;
  onCommentsChange?: (comments: TaskComment[]) => void;
}

export function TaskActivityPanel({
  task,
  onCommentsChange,
}: TaskActivityPanelProps) {
  const [tab, setTab] = useState<ActivityTab>("comments");
  const [comments, setComments] = useState<TaskComment[]>(task.comments ?? []);
  const [body, setBody] = useState("");
  const [loading, setLoading] = useState(false);
  const [posting, setPosting] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    fetch(`/api/tasks/${task.id}/comments`)
      .then(async (response) => {
        if (!response.ok) return [];
        return (await response.json()) as TaskComment[];
      })
      .then((rows) => {
        if (cancelled) return;
        setComments(rows);
        onCommentsChange?.(rows);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [task.id, onCommentsChange]);

  async function handlePost() {
    const trimmed = body.trim();
    if (!trimmed || posting) return;
    setPosting(true);
    try {
      const response = await fetch(`/api/tasks/${task.id}/comments`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          body: trimmed,
          authorId: readCurrentMemberId() || null,
        }),
      });
      if (!response.ok) {
        const data = (await response.json().catch(() => null)) as {
          error?: string;
        } | null;
        window.alert(data?.error ?? "บันทึกความคิดเห็นไม่สำเร็จ");
        return;
      }
      const created = (await response.json()) as TaskComment;
      setComments((current) => {
        const next = [...current, created];
        onCommentsChange?.(next);
        return next;
      });
      setBody("");
    } finally {
      setPosting(false);
    }
  }

  async function handleDelete(commentId: string) {
    if (deletingId) return;
    setDeletingId(commentId);
    try {
      const response = await fetch(
        `/api/tasks/${task.id}/comments/${commentId}`,
        { method: "DELETE" },
      );
      if (!response.ok) {
        const data = (await response.json().catch(() => null)) as {
          error?: string;
        } | null;
        window.alert(data?.error ?? "ลบความคิดเห็นไม่สำเร็จ");
        return;
      }
      setComments((current) => {
        const next = current.filter((item) => item.id !== commentId);
        onCommentsChange?.(next);
        return next;
      });
    } finally {
      setDeletingId(null);
    }
  }

  const tabs: { id: ActivityTab; label: string }[] = [
    { id: "comments", label: "Comments" },
    { id: "history", label: "History" },
    { id: "postRelease", label: "ปรับหลังขึ้น" },
  ];

  return (
    <div className="space-y-3">
      <div className="inline-flex rounded-lg bg-slate-100 p-0.5">
        {tabs.map((item) => (
          <button
            key={item.id}
            type="button"
            onClick={() => setTab(item.id)}
            className={cn(
              "rounded-md px-2.5 py-1 text-xs font-medium transition",
              tab === item.id
                ? "bg-white text-primary shadow-sm"
                : "text-slate-500 hover:text-slate-700",
            )}
          >
            {item.label}
          </button>
        ))}
      </div>

      {tab === "comments" ? (
        <div className="space-y-3">
          {loading ? (
            <p className="text-xs text-slate-500">กำลังโหลด...</p>
          ) : comments.length === 0 ? (
            <p className="text-xs text-slate-500">ยังไม่มีความคิดเห็น</p>
          ) : (
            <ol className="space-y-2">
              {comments.map((comment) => (
                <li
                  key={comment.id}
                  className="rounded-lg border border-slate-200 bg-white px-3 py-2"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <p className="text-xs font-medium text-slate-700">
                        {comment.authorNickname || "ระบบ"}
                        <span className="ml-2 font-normal text-slate-400">
                          {formatDateTime(comment.createdAt)}
                        </span>
                      </p>
                      <p className="mt-1 whitespace-pre-wrap text-sm text-slate-700">
                        {comment.body}
                      </p>
                    </div>
                    <button
                      type="button"
                      className="shrink-0 rounded p-1 text-slate-400 hover:bg-red-50 hover:text-red-600"
                      disabled={deletingId === comment.id}
                      onClick={() => handleDelete(comment.id)}
                      aria-label="ลบความคิดเห็น"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                </li>
              ))}
            </ol>
          )}

          <div className="space-y-2">
            <Textarea
              rows={3}
              placeholder="เขียนความคิดเห็น..."
              value={body}
              onChange={(event) => setBody(event.target.value)}
            />
            <div className="flex justify-end">
              <Button
                type="button"
                size="sm"
                disabled={!body.trim() || posting}
                onClick={handlePost}
              >
                <LoadingButtonContent
                  loading={posting}
                  loadingText="กำลังบันทึก..."
                >
                  <MessageSquare className="h-3.5 w-3.5" />
                  เพิ่ม Comment
                </LoadingButtonContent>
              </Button>
            </div>
          </div>
        </div>
      ) : null}

      {tab === "history" ? (
        <div className="rounded-xl border border-slate-200 bg-slate-50/80 p-3">
          <div className="mb-2 flex items-center gap-2 text-sm font-medium text-slate-700">
            <History className="h-4 w-4 text-slate-500" />
            ประวัติสถานะ
          </div>
          {(task.statusHistory ?? []).length === 0 ? (
            <p className="text-xs text-slate-500">
              ยังไม่มีประวัติการเปลี่ยนสถานะ
            </p>
          ) : (
            <ol className="space-y-2">
              {[...(task.statusHistory ?? [])]
                .slice()
                .reverse()
                .map((entry) => (
                  <li
                    key={entry.id}
                    className="flex items-start justify-between gap-3 text-sm"
                  >
                    <div className="min-w-0">
                      {entry.fromStatusName ? (
                        <p className="text-slate-700">
                          <span className="text-slate-500">
                            {entry.fromStatusName}
                          </span>
                          {" → "}
                          <span className="font-medium">
                            {entry.toStatusName}
                          </span>
                        </p>
                      ) : (
                        <p className="text-slate-700">
                          เริ่มที่{" "}
                          <span className="font-medium">
                            {entry.toStatusName}
                          </span>
                        </p>
                      )}
                    </div>
                    <time className="shrink-0 text-xs text-slate-500">
                      {formatDateTime(entry.changedAt)}
                    </time>
                  </li>
                ))}
            </ol>
          )}
        </div>
      ) : null}

      {tab === "postRelease" ? (
        <div className="rounded-xl border border-slate-200 bg-slate-50/80 p-3">
          <div className="mb-2 flex items-center gap-2 text-sm font-medium text-slate-700">
            <History className="h-4 w-4 text-slate-500" />
            ปรับหลังขึ้น
          </div>
          {(task.postReleaseChanges ?? []).length === 0 ? (
            <p className="text-xs text-slate-500">
              ยังไม่มีการปรับ flow หลังขึ้น UAT/PRD
            </p>
          ) : (
            <ol className="space-y-2">
              {[...(task.postReleaseChanges ?? [])]
                .slice()
                .reverse()
                .map((entry) => (
                  <li
                    key={entry.id}
                    className="flex items-start justify-between gap-3 text-sm"
                  >
                    <div className="min-w-0">
                      <p className="text-slate-700">
                        <span className="font-medium">
                          {postReleaseChangeTypeLabel(entry.changeType)}
                        </span>
                        {": "}
                        <span className="text-slate-500">
                          {entry.fromValue || "—"}
                        </span>
                        {" → "}
                        <span className="font-medium">
                          {entry.toValue || "—"}
                        </span>
                      </p>
                      <p className="mt-0.5 text-xs text-slate-500">
                        {entry.reason}
                      </p>
                    </div>
                    <time className="shrink-0 text-xs text-slate-500">
                      {formatDateTime(entry.changedAt)}
                    </time>
                  </li>
                ))}
            </ol>
          )}
        </div>
      ) : null}
    </div>
  );
}
