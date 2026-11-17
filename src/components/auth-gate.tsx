"use client";

import { useEffect, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { readMemberSession } from "@/lib/current-member";

export function AuthGate({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const session = readMemberSession();
    if (!session) {
      const next = encodeURIComponent(pathname || "/dashboard");
      router.replace(`/signin?next=${next}`);
      return;
    }
    setReady(true);
  }, [router, pathname]);

  if (!ready) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-canvas text-sm text-slate-500">
        กำลังเข้าสู่ระบบ...
      </div>
    );
  }

  return <>{children}</>;
}
