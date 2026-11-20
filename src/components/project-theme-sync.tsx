"use client";

import { useEffect, useState } from "react";
import { usePathname, useSearchParams } from "next/navigation";
import { fetchJsonArray } from "@/lib/fetch-json";
import {
  readSelectedProjectId,
  SELECTED_PROJECT_EVENT,
} from "@/lib/selected-project";
import {
  DEFAULT_THEME_ID,
  applyTheme,
  resolveProjectTheme,
  setCachedCustomThemes,
  type CustomThemeRecord,
} from "@/lib/themes";
import type { ColorTheme, Project } from "@/lib/types";

function isPickerPath(pathname: string) {
  return (
    pathname === "/projects" ||
    pathname.startsWith("/projects/manage") ||
    pathname.startsWith("/dashboard") ||
    pathname.startsWith("/login") ||
    pathname.startsWith("/signin")
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
 * Project picker / aggregate pages stay on clean white.
 * After a project is selected, apply that project's theme across the workspace.
 */
export function ProjectThemeSync() {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const urlProjectId = searchParams.get("project");
  const [storedProjectId, setStoredProjectId] = useState("");
  const [projects, setProjects] = useState<Project[]>([]);
  const [customThemes, setCustomThemes] = useState<CustomThemeRecord[]>([]);

  useEffect(() => {
    const syncStored = () => setStoredProjectId(readSelectedProjectId());
    syncStored();
    window.addEventListener(SELECTED_PROJECT_EVENT, syncStored);
    window.addEventListener("storage", syncStored);
    return () => {
      window.removeEventListener(SELECTED_PROJECT_EVENT, syncStored);
      window.removeEventListener("storage", syncStored);
    };
  }, []);

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
    const projectId = (urlProjectId?.trim() || storedProjectId.trim()) || "";

    // Picker / overview pages stay neutral until a project workspace is open.
    if (isPickerPath(pathname) && !urlProjectId) {
      applyTheme(DEFAULT_THEME_ID, { customThemes });
      return;
    }

    if (!projectId) {
      applyTheme(DEFAULT_THEME_ID, { customThemes });
      return;
    }

    const project = projects.find((item) => item.id === projectId);
    if (!project) return;

    applyTheme(resolveProjectTheme(project.theme, customThemes), {
      customThemes,
    });
  }, [pathname, urlProjectId, storedProjectId, projects, customThemes]);

  return null;
}
