"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { readMemberSession } from "@/lib/current-member";

export default function HomePage() {
  const router = useRouter();

  useEffect(() => {
    const session = readMemberSession();
    router.replace(session ? "/projects" : "/login");
  }, [router]);

  return (
    <div className="flex min-h-screen items-center justify-center bg-canvas text-sm text-slate-500">
      กำลังเปลี่ยนหน้า...
    </div>
  );
}
