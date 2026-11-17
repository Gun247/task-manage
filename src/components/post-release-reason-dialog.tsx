"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Label, Textarea } from "@/components/ui/input";
import { LoadingButtonContent } from "@/components/ui/loading";

interface PostReleaseReasonDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  loading?: boolean;
  summary?: string;
  onConfirm: (reason: string) => void | Promise<void>;
}

export function PostReleaseReasonDialog({
  open,
  onOpenChange,
  loading = false,
  summary,
  onConfirm,
}: PostReleaseReasonDialogProps) {
  const [reason, setReason] = useState("");
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    setReason("");
    setError(null);
  }, [open]);

  async function handleConfirm() {
    const trimmed = reason.trim();
    if (!trimmed) {
      setError("กรุณาระบุเหตุผล");
      return;
    }
    setError(null);
    await onConfirm(trimmed);
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        if (loading) return;
        onOpenChange(next);
      }}
    >
      <DialogContent
        className="max-w-md"
        onPointerDownOutside={(event) => {
          if (loading) event.preventDefault();
        }}
        onEscapeKeyDown={(event) => {
          if (loading) event.preventDefault();
        }}
      >
        <DialogHeader className="pr-6">
          <DialogTitle className="text-primary">
            บันทึกเหตุผลหลังขึ้น UAT/PRD
          </DialogTitle>
          <DialogDescription className="whitespace-pre-line">
            Task นี้เคยขึ้น UAT หรือ PRD แล้ว การเปลี่ยนสถานะ/วันที่จะถูกบันทึกเป็นประวัติ
            แบบ Jira — ถ้าจะย้อนไปแก้ ให้เข้า Modify ก่อน
            (HOLD ได้เฉพาะจาก Backlog / In Progress / UAT)
            {summary ? `\n\n${summary}` : ""}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-2">
          <Label htmlFor="post-release-reason">เหตุผล</Label>
          <Textarea
            id="post-release-reason"
            value={reason}
            onChange={(event) => setReason(event.target.value)}
            placeholder="เช่น แก้บั๊กหลังขึ้น UAT, เลื่อนวัน PRD ตามแผนใหม่"
            rows={3}
            disabled={loading}
          />
          {error ? <p className="text-xs text-red-600">{error}</p> : null}
        </div>

        <div className="flex justify-end gap-2 pt-2">
          <Button
            type="button"
            variant="outline"
            disabled={loading}
            onClick={() => onOpenChange(false)}
          >
            ยกเลิก
          </Button>
          <Button type="button" disabled={loading} onClick={() => void handleConfirm()}>
            <LoadingButtonContent loading={loading} loadingText="กำลังบันทึก...">
              บันทึกพร้อมเหตุผล
            </LoadingButtonContent>
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
