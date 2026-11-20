"use client";

import { useEffect, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import {
  readSelectedProjectId,
  writeSelectedProjectId,
} from "@/lib/selected-project";

function needsWorkspaceProject(pathname: string) {
  return (
    pathname.startsWith("/tasks") ||
    pathname.startsWith("/timeline") ||
    pathname.startsWith("/history")
  );
}

/**
 * Work surfaces require a selected project (URL or persisted).
 * Flow: login → /projects → open project → theme/settings follow that project.
 */
export function ProjectWorkspaceGate({
  children,
}: {
  children: React.ReactNode;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [ready, setReady] = useState(() => !needsWorkspaceProject(pathname));

  useEffect(() => {
    if (!needsWorkspaceProject(pathname)) {
      setReady(true);
      return;
    }

    const urlProject = searchParams.get("project")?.trim() ?? "";
    const storedProject = readSelectedProjectId().trim();
    const projectId = urlProject || storedProject;

    if (!projectId) {
      setReady(false);
      router.replace("/projects");
      return;
    }

    if (urlProject) {
      if (urlProject !== storedProject) {
        writeSelectedProjectId(urlProject);
      }
      setReady(true);
      return;
    }

    setReady(false);
    const params = new URLSearchParams(searchParams.toString());
    params.set("project", projectId);
    writeSelectedProjectId(projectId);
    router.replace(`${pathname}?${params.toString()}`);
  }, [pathname, router, searchParams]);

  if (!ready) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-canvas text-sm text-slate-500">
        กำลังเปิดโปรเจกต์...
      </div>
    );
  }

  return <>{children}</>;
}
