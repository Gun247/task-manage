const STORAGE_KEY = "fwf-selected-project-id";
export const SELECTED_PROJECT_EVENT = "fwf-selected-project-changed";

export function readSelectedProjectId() {
  if (typeof window === "undefined") return "";
  try {
    return window.localStorage.getItem(STORAGE_KEY) ?? "";
  } catch {
    return "";
  }
}

export function writeSelectedProjectId(projectId: string | null) {
  if (typeof window === "undefined") return;
  try {
    if (!projectId) {
      window.localStorage.removeItem(STORAGE_KEY);
    } else {
      window.localStorage.setItem(STORAGE_KEY, projectId);
    }
  } catch {
    /* ignore quota / private mode */
  }
  window.dispatchEvent(
    new CustomEvent(SELECTED_PROJECT_EVENT, {
      detail: { projectId: projectId ?? "" },
    }),
  );
}

/** Prefer URL `?project=`, then persisted selection. */
export function resolveWorkspaceProjectId(urlProjectId: string | null | undefined) {
  const fromUrl = urlProjectId?.trim() ?? "";
  if (fromUrl) return fromUrl;
  return readSelectedProjectId();
}
