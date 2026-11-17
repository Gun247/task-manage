"use client";

import { useEffect, useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input, Label } from "@/components/ui/input";
import {
  readCurrentMemberId,
  writeCurrentMemberId,
} from "@/lib/current-member";
import type { TeamMember } from "@/lib/types";
import { LogIn, LogOut } from "lucide-react";

interface MemberLoginProps {
  teamMembers: TeamMember[];
}

function normalizeEmployeeId(value: string) {
  return value.trim().toLowerCase();
}

export function findMemberByEmployeeId(
  teamMembers: TeamMember[],
  employeeId: string,
) {
  const needle = normalizeEmployeeId(employeeId);
  if (!needle) return null;
  return (
    teamMembers.find(
      (member) =>
        member.isActive &&
        normalizeEmployeeId(member.employeeId) === needle,
    ) ?? null
  );
}

export function MemberLogin({ teamMembers }: MemberLoginProps) {
  const [memberId, setMemberId] = useState("");
  const [open, setOpen] = useState(false);
  const [employeeId, setEmployeeId] = useState("");
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setMemberId(readCurrentMemberId());
    const onChange = () => setMemberId(readCurrentMemberId());
    window.addEventListener("fwf-current-member-changed", onChange);
    return () =>
      window.removeEventListener("fwf-current-member-changed", onChange);
  }, []);

  const currentMember = useMemo(
    () => teamMembers.find((member) => member.id === memberId) ?? null,
    [teamMembers, memberId],
  );

  function handleLogout() {
    writeCurrentMemberId("");
    setMemberId("");
  }

  function handleLogin(event: React.FormEvent) {
    event.preventDefault();
    const member = findMemberByEmployeeId(teamMembers, employeeId);
    if (!member) {
      setError("ไม่พบเลขพนักงานนี้ในทีม");
      return;
    }
    writeCurrentMemberId(member.id);
    setMemberId(member.id);
    setEmployeeId("");
    setError(null);
    setOpen(false);
  }

  if (currentMember) {
    return (
      <div className="flex items-center gap-1.5">
        <span
          className="hidden max-w-[7rem] truncate rounded-md border border-slate-200 bg-white px-2 py-1 text-xs font-medium text-slate-700 sm:inline"
          title={`${currentMember.nickname}${currentMember.employeeId ? ` · ${currentMember.employeeId}` : ""}`}
        >
          {currentMember.nickname}
        </span>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          className="h-8 px-2 text-slate-500"
          onClick={handleLogout}
          title="ออกจากระบบ"
          aria-label="ออกจากระบบ"
        >
          <LogOut className="h-3.5 w-3.5" />
        </Button>
      </div>
    );
  }

  return (
    <>
      <Button
        type="button"
        variant="outline"
        size="sm"
        className="h-9 rounded-lg px-3 text-sm"
        onClick={() => {
          setError(null);
          setEmployeeId("");
          setOpen(true);
        }}
      >
        <LogIn className="h-3.5 w-3.5" />
        <span className="hidden sm:inline">เข้าสู่ระบบ</span>
      </Button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>เข้าสู่ระบบ</DialogTitle>
            <DialogDescription>
              กรอกเลขพนักงานเพื่อใช้ Watch / Comment / การแจ้งเตือน
            </DialogDescription>
          </DialogHeader>
          <form className="space-y-4" onSubmit={handleLogin}>
            <div>
              <Label htmlFor="login-employee-id">เลขพนักงาน</Label>
              <Input
                id="login-employee-id"
                autoFocus
                required
                placeholder="เช่น 12345"
                value={employeeId}
                onChange={(event) => {
                  setEmployeeId(event.target.value);
                  setError(null);
                }}
              />
              {error ? (
                <p className="mt-1.5 text-xs text-red-600">{error}</p>
              ) : null}
            </div>
            <div className="flex justify-end gap-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => setOpen(false)}
              >
                ยกเลิก
              </Button>
              <Button type="submit" disabled={!employeeId.trim()}>
                เข้าสู่ระบบ
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </>
  );
}
