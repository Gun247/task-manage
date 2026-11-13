"use client";

import { useEffect, useState } from "react";
import { usePathname, useSearchParams } from "next/navigation";
import { fetchJsonArray } from "@/lib/fetch-json";
import {
  DEFAULT_THEME_ID,
  applyTheme,
  resolveProjectTheme,
} from "@/lib/themes";
import type { Project } from "@/lib/types";

function isProjectScopedPath(pathname: string) {
  return (
    pathname.startsWith("/tasks") ||
    pathname.startsWith("/history") ||
    pathname.startsWith("/timeline")
  );
}

/**
 * Aggregate pages stay on clean white. When a project is in the URL
 * (tasks / history / timeline), apply that project's theme.
 */
export function ProjectThemeSync() {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const projectId = searchParams.get("project");
  const [projects, setProjects] = useState<Project[]>([]);

  useEffect(() => {
    let cancelled = false;

    function load() {
      fetchJsonArray<Project>("/api/projects")
        .then((data) => {
          if (!cancelled) setProjects(data);
        })
        .catch(() => {
          if (!cancelled) setProjects([]);
        });
    }

    load();
    window.addEventListener("fwf-projects-changed", load);
    return () => {
      cancelled = true;
      window.removeEventListener("fwf-projects-changed", load);
    };
  }, []);

  useEffect(() => {
    if (!isProjectScopedPath(pathname) || !projectId) {
      applyTheme(DEFAULT_THEME_ID);
      return;
    }

    const project = projects.find((item) => item.id === projectId);
    if (!project) {
      // Keep current theme until projects load — avoid flashing clean white.
      return;
    }

    applyTheme(resolveProjectTheme(project.theme));
  }, [pathname, projectId, projects]);

  return null;
}
