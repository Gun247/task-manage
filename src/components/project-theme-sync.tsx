"use client";

import { useEffect, useState } from "react";
import { usePathname, useSearchParams } from "next/navigation";
import { fetchJsonArray } from "@/lib/fetch-json";
import {
  DEFAULT_THEME_ID,
  applyTheme,
  resolveProjectTheme,
  setCachedCustomThemes,
  type CustomThemeRecord,
} from "@/lib/themes";
import type { ColorTheme, Project } from "@/lib/types";

function isProjectScopedPath(pathname: string) {
  return (
    pathname.startsWith("/tasks") ||
    pathname.startsWith("/history") ||
    pathname.startsWith("/timeline")
  );
}

function toCustomRecords(themes: ColorTheme[]): CustomThemeRecord[] {
  return themes.map((theme) => ({
    id: theme.id,
    label: theme.label,
    description: theme.description,
    palette: theme.palette,
    swatches: [
      theme.palette.primary,
      theme.palette.accent,
      theme.palette.muted,
    ],
  }));
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
  const [customThemes, setCustomThemes] = useState<CustomThemeRecord[]>([]);

  useEffect(() => {
    let cancelled = false;

    function loadProjects() {
      fetchJsonArray<Project>("/api/projects")
        .then((data) => {
          if (!cancelled) setProjects(data);
        })
        .catch(() => {
          if (!cancelled) setProjects([]);
        });
    }

    function loadThemes() {
      fetchJsonArray<ColorTheme>("/api/themes")
        .then((data) => {
          if (cancelled) return;
          const records = toCustomRecords(data);
          setCustomThemes(records);
          setCachedCustomThemes(records);
          window.dispatchEvent(new Event("fwf-themes-cache-updated"));
        })
        .catch(() => {
          if (cancelled) return;
          setCustomThemes([]);
          setCachedCustomThemes([]);
        });
    }

    function loadAll() {
      loadProjects();
      loadThemes();
    }

    loadAll();
    window.addEventListener("fwf-projects-changed", loadProjects);
    window.addEventListener("fwf-themes-changed", loadThemes);
    return () => {
      cancelled = true;
      window.removeEventListener("fwf-projects-changed", loadProjects);
      window.removeEventListener("fwf-themes-changed", loadThemes);
    };
  }, []);

  useEffect(() => {
    if (!isProjectScopedPath(pathname) || !projectId) {
      applyTheme(DEFAULT_THEME_ID, { customThemes });
      return;
    }

    const project = projects.find((item) => item.id === projectId);
    if (!project) return;

    applyTheme(resolveProjectTheme(project.theme, customThemes), {
      customThemes,
    });
  }, [pathname, projectId, projects, customThemes]);

  return null;
}
