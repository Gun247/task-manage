"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { FolderKanban } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input, Label } from "@/components/ui/input";
import { LoadingButtonContent } from "@/components/ui/loading";
import {
  readMemberSession,
  writeMemberSession,
  type MemberSession,
} from "@/lib/current-member";

export function SignInPageContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const nextPath = searchParams.get("next") || "/dashboard";
  const [employeeId, setEmployeeId] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [checking, setChecking] = useState(true);

  useEffect(() => {
    const session = readMemberSession();
    if (session) {
      router.replace(nextPath.startsWith("/") ? nextPath : "/dashboard");
      return;
    }
    setChecking(false);
  }, [router, nextPath]);

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    const trimmed = employeeId.trim();
    if (!trimmed || loading) return;

    setLoading(true);
    setError(null);
    try {
      const response = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ employeeId: trimmed }),
      });
      const data = (await response.json().catch(() => null)) as
        | (MemberSession & { error?: string })
        | null;
      if (!response.ok || !data?.id) {
        setError(data?.error ?? "เข้าสู่ระบบไม่สำเร็จ");
        return;
      }
      writeMemberSession({
        id: data.id,
        nickname: data.nickname,
        employeeId: data.employeeId,
        role: data.role,
        color: data.color,
      });
      router.replace(nextPath.startsWith("/") ? nextPath : "/dashboard");
    } finally {
      setLoading(false);
    }
  }

  if (checking) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[var(--background,#E8F4FC)] text-sm text-slate-500">
        กำลังตรวจสอบเซสชัน...
      </div>
    );
  }

  return (
    <div className="relative flex min-h-svh items-center justify-center overflow-hidden bg-[linear-gradient(165deg,#e8f1ff_0%,#f5f8fc_38%,#eef8f1_100%)] px-4 py-10">
      <div
        className="pointer-events-none absolute inset-0 opacity-40"
        style={{
          backgroundImage:
            "radial-gradient(circle at 12% 18%, rgba(91,181,232,0.35), transparent 42%), radial-gradient(circle at 88% 12%, rgba(107,184,42,0.28), transparent 38%)",
        }}
      />

      <div className="relative w-full max-w-md">
        <Link
          href="/login"
          className="mb-6 inline-flex items-center gap-3 rounded-xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/30"
        >
          <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-primary text-white shadow-sm">
            <FolderKanban className="h-5 w-5" aria-hidden />
          </span>
          <div>
            <p className="text-base font-bold text-primary">TIM TaskManage</p>
          </div>
        </Link>

        <h1 className="text-2xl font-bold tracking-tight text-slate-900">
          เข้าสู่ระบบ
        </h1>
        <p className="mt-1.5 text-sm text-slate-600">
          กรอกเลขพนักงานที่ Admin เพิ่มไว้ในโปรเจกต์
        </p>

        <form
          onSubmit={handleSubmit}
          className="mt-6 rounded-2xl border border-slate-200/80 bg-white/95 p-6 shadow-[0_8px_24px_rgba(30,58,47,0.06)]"
        >
          <div>
            <Label htmlFor="employee-id">เลขพนักงาน</Label>
            <Input
              id="employee-id"
              autoFocus
              required
              className="mt-1.5 h-11"
              placeholder="กรอกเลขพนักงาน"
              value={employeeId}
              onChange={(event) => {
                setEmployeeId(event.target.value);
                setError(null);
              }}
            />
            {error ? (
              <p className="mt-2 text-xs text-red-600" role="alert">
                {error}
              </p>
            ) : (
              <p className="mt-2 text-xs text-slate-500">
                ยังไม่มีเลข? ขอให้ Administrator เพิ่มใน Settings → ทีม
              </p>
            )}
          </div>
          <Button
            type="submit"
            className="mt-5 h-11 w-full"
            disabled={loading || !employeeId.trim()}
          >
            <LoadingButtonContent
              loading={loading}
              loadingText="กำลังเข้าสู่ระบบ..."
            >
              เข้าสู่ระบบ
            </LoadingButtonContent>
          </Button>
        </form>

        <p className="mt-5 text-center text-xs text-slate-500">
          <Link
            href="/login"
            className="font-medium text-primary hover:underline"
          >
            ← ดูแนะนำผลิตภัณฑ์
          </Link>
        </p>
      </div>
    </div>
  );
}
