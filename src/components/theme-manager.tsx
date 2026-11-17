"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  Check,
  FileJson2,
  Pencil,
  Plus,
  Trash2,
  X,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { ColorTray, normalizeHex } from "@/components/ui/color-tray";
import { Input, Label } from "@/components/ui/input";
import { LoadingButtonContent } from "@/components/ui/loading";
import { fetchJsonArray } from "@/lib/fetch-json";
import {
  THEME_IMPORT_EXAMPLE,
  validateThemeDefinition,
} from "@/lib/theme-definition";
import type { ColorTheme } from "@/lib/types";
import { cn } from "@/lib/utils";

const PRESET_COLORS = [
  "#EF4444",
  "#F97316",
  "#EAB308",
  "#22C55E",
  "#14B8A6",
  "#3B82F6",
  "#8B5CF6",
  "#EC4899",
  "#334155",
  "#6BB82A",
] as const;

type ThemeFormState = {
  id: string;
  label: string;
  description: string;
  primary: string;
  accent: string;
  background: string;
  foreground: string;
  canvas: string;
  muted: string;
  border: string;
};

const EMPTY_FORM: ThemeFormState = {
  id: "",
  label: "",
  description: "",
  primary: "#0B6E99",
  accent: "#1FA2C5",
  background: "#F3FAFD",
  foreground: "#102A37",
  canvas: "#F7FBFD",
  muted: "#D7EEF6",
  border: "#C5DCE6",
};

function formToPayload(form: ThemeFormState) {
  return {
    id: form.id.trim().toLowerCase() || undefined,
    label: form.label.trim(),
    description: form.description.trim(),
    primary: form.primary,
    accent: form.accent,
    background: form.background,
    foreground: form.foreground,
    canvas: form.canvas,
    muted: form.muted,
    border: form.border,
  };
}

export function ThemeManager() {
  const [themes, setThemes] = useState<ColorTheme[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [form, setForm] = useState<ThemeFormState>(EMPTY_FORM);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [importOpen, setImportOpen] = useState(false);
  const [importText, setImportText] = useState(
    JSON.stringify(THEME_IMPORT_EXAMPLE, null, 2),
  );
  const [importBusy, setImportBusy] = useState(false);
  const [importMessage, setImportMessage] = useState<string | null>(null);

  const loadThemes = useCallback(async () => {
    try {
      setError(null);
      setThemes(await fetchJsonArray<ColorTheme>("/api/themes"));
    } catch (err) {
      setThemes([]);
      setError(err instanceof Error ? err.message : "โหลดธีมไม่สำเร็จ");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadThemes();
    const onChanged = () => {
      void loadThemes();
    };
    window.addEventListener("fwf-themes-changed", onChanged);
    window.addEventListener("focus", onChanged);
    return () => {
      window.removeEventListener("fwf-themes-changed", onChanged);
      window.removeEventListener("focus", onChanged);
    };
  }, [loadThemes]);

  const previewIssues = useMemo(() => {
    const result = validateThemeDefinition(formToPayload(form), {
      requireId: Boolean(editingId),
    });
    return result.ok ? [] : result.issues;
  }, [form, editingId]);

  function resetForm() {
    setEditingId(null);
    setForm(EMPTY_FORM);
  }

  function startEdit(theme: ColorTheme) {
    setEditingId(theme.id);
    setForm({
      id: theme.id,
      label: theme.label,
      description: theme.description,
      primary: theme.palette.primary,
      accent: theme.palette.accent,
      background: theme.palette.background,
      foreground: theme.palette.foreground,
      canvas: theme.palette.canvas,
      muted: theme.palette.muted,
      border: theme.palette.border,
    });
  }

  async function saveTheme() {
    const payload = formToPayload(form);
    const colorsOk = [
      payload.primary,
      payload.accent,
      payload.background,
      payload.foreground,
      payload.canvas,
      payload.muted,
      payload.border,
    ].every((value) => normalizeHex(value));
    if (!payload.label || !colorsOk || previewIssues.length > 0) return;

    setSaving(true);
    const response = await fetch(
      editingId ? `/api/themes/${editingId}` : "/api/themes",
      {
        method: editingId ? "PATCH" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      },
    );
    setSaving(false);

    if (!response.ok) {
      const data = (await response.json().catch(() => null)) as {
        error?: string;
        issues?: { message: string }[];
      } | null;
      setError(
        data?.issues?.map((item) => item.message).join(" · ") ||
          data?.error ||
          "บันทึกธีมไม่สำเร็จ",
      );
      return;
    }

    resetForm();
    await loadThemes();
    window.dispatchEvent(new Event("fwf-themes-changed"));
  }

  async function removeTheme(theme: ColorTheme) {
    setDeletingId(theme.id);
    const response = await fetch(`/api/themes/${theme.id}`, {
      method: "DELETE",
    });
    setDeletingId(null);
    if (response.ok) {
      if (editingId === theme.id) resetForm();
      await loadThemes();
      window.dispatchEvent(new Event("fwf-themes-changed"));
    }
  }

  async function importThemes() {
    setImportBusy(true);
    setImportMessage(null);
    let parsed: unknown;
    try {
      parsed = JSON.parse(importText);
    } catch {
      setImportBusy(false);
      setImportMessage("JSON ไม่ถูกต้อง");
      return;
    }

    const response = await fetch("/api/themes", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ mode: "import", payload: parsed }),
    });
    const data = (await response.json().catch(() => null)) as {
      created?: unknown[];
      failed?: { index: number; issues: { message: string }[] }[];
      error?: string;
      issues?: { message: string }[];
    } | null;
    setImportBusy(false);

    if (!response.ok && !(data?.created && data.created.length > 0)) {
      setImportMessage(
        data?.issues?.map((item) => item.message).join(" · ") ||
          data?.error ||
          "นำเข้าไม่สำเร็จ",
      );
      return;
    }

    const createdCount = data?.created?.length ?? 0;
    const failedCount = data?.failed?.length ?? 0;
    setImportMessage(
      `นำเข้าสำเร็จ ${createdCount} ธีม` +
        (failedCount ? ` · ไม่ผ่าน ${failedCount} รายการ` : ""),
    );
    await loadThemes();
    window.dispatchEvent(new Event("fwf-themes-changed"));
  }

  return (
    <div className="space-y-4">
      <div className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-xs leading-relaxed text-slate-600">
        <p className="font-medium text-slate-800">มาตรฐานสีธีม (นำเข้า / สร้าง)</p>
        <p className="mt-1">
          บังคับ: <code className="text-[11px]">label</code>,{" "}
          <code className="text-[11px]">primary</code>,{" "}
          <code className="text-[11px]">accent</code>,{" "}
          <code className="text-[11px]">background</code>,{" "}
          <code className="text-[11px]">foreground</code> เป็น{" "}
          <code className="text-[11px]">#RRGGBB</code>
        </p>
        <p className="mt-0.5">
          ทางเลือก: id, description, primaryDark, muted, border, canvas,
          success, danger, warning, slate.50–900 — ถ้าไม่ใส่ระบบจะคำนวณให้
        </p>
      </div>

      {error ? (
        <p className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
          {error}
        </p>
      ) : null}

      <div className="space-y-2">
        <div className="flex items-center justify-between gap-2">
          <h3 className="text-sm font-semibold text-slate-800">
            ธีมที่สร้างเอง ({themes.length})
          </h3>
          <Button
            type="button"
            variant="outline"
            className="h-8 px-2.5 text-xs"
            onClick={() => setImportOpen((open) => !open)}
          >
            <FileJson2 className="h-3.5 w-3.5" />
            นำเข้า JSON
          </Button>
        </div>

        {loading ? (
          <p className="text-sm text-slate-500">กำลังโหลด...</p>
        ) : themes.length === 0 ? (
          <p className="rounded-lg border border-dashed border-slate-200 px-3 py-4 text-center text-sm text-slate-500">
            ยังไม่มีธีมที่สร้างเอง — สร้างด้านล่างหรือนำเข้า JSON
          </p>
        ) : (
          <ul className="space-y-2">
            {themes.map((theme) => (
              <li
                key={theme.id}
                className="flex items-center gap-3 rounded-xl border border-slate-200 bg-white px-3 py-2.5"
              >
                <span
                  className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg text-white"
                  style={{
                    background: `linear-gradient(135deg, ${theme.palette.accent}, ${theme.palette.primary})`,
                  }}
                />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium text-slate-800">
                    {theme.label}
                  </p>
                  <p className="truncate text-xs text-slate-500">
                    {theme.id}
                    {theme.description ? ` · ${theme.description}` : ""}
                  </p>
                </div>
                <button
                  type="button"
                  className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-50 hover:text-slate-700"
                  onClick={() => startEdit(theme)}
                  aria-label={`แก้ไข ${theme.label}`}
                >
                  <Pencil className="h-4 w-4" />
                </button>
                <button
                  type="button"
                  className="rounded-lg p-1.5 text-slate-400 hover:bg-red-50 hover:text-red-600"
                  onClick={() => void removeTheme(theme)}
                  disabled={deletingId === theme.id}
                  aria-label={`ลบ ${theme.label}`}
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>

      {importOpen ? (
        <div className="space-y-2 rounded-xl border border-slate-200 p-3">
          <div className="flex items-center justify-between gap-2">
            <Label htmlFor="theme-import-json">นำเข้าธีม (JSON)</Label>
            <button
              type="button"
              className="text-slate-400 hover:text-slate-700"
              onClick={() => setImportOpen(false)}
              aria-label="ปิด"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
          <textarea
            id="theme-import-json"
            value={importText}
            onChange={(event) => setImportText(event.target.value)}
            rows={10}
            className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 font-mono text-xs text-slate-800 outline-none focus:border-primary focus:ring-2 focus:ring-primary/20"
            spellCheck={false}
          />
          {importMessage ? (
            <p className="text-xs text-slate-600">{importMessage}</p>
          ) : null}
          <Button
            type="button"
            className="h-9"
            disabled={importBusy}
            onClick={() => void importThemes()}
          >
            <LoadingButtonContent
              loading={importBusy}
              loadingText="กำลังนำเข้า..."
            >
              นำเข้าตามมาตรฐาน
            </LoadingButtonContent>
          </Button>
        </div>
      ) : null}

      <div className="space-y-3 rounded-xl border border-slate-200 p-3">
        <div className="flex items-center justify-between gap-2">
          <h3 className="text-sm font-semibold text-slate-800">
            {editingId ? "แก้ไขธีม" : "สร้างธีมใหม่"}
          </h3>
          {editingId ? (
            <button
              type="button"
              className="text-xs text-slate-500 hover:text-slate-800"
              onClick={resetForm}
            >
              ยกเลิกแก้ไข
            </button>
          ) : null}
        </div>

        <div className="grid gap-3 sm:grid-cols-2">
          <div className={cn(editingId && "sm:col-span-2")}>
            <Label htmlFor="theme-label">ชื่อธีม</Label>
            <Input
              id="theme-label"
              value={form.label}
              onChange={(event) =>
                setForm((current) => ({ ...current, label: event.target.value }))
              }
              placeholder="เช่น Brand Ocean"
            />
          </div>
          {!editingId ? (
            <div>
              <Label htmlFor="theme-id">id (ไม่บังคับ)</Label>
              <Input
                id="theme-id"
                value={form.id}
                onChange={(event) =>
                  setForm((current) => ({
                    ...current,
                    id: event.target.value.toLowerCase(),
                  }))
                }
                placeholder="brand-ocean"
              />
            </div>
          ) : (
            <div className="sm:col-span-2">
              <Label>id</Label>
              <p className="mt-1 text-sm text-slate-600">{editingId}</p>
            </div>
          )}
        </div>

        <div>
          <Label htmlFor="theme-description">คำอธิบาย</Label>
          <Input
            id="theme-description"
            value={form.description}
            onChange={(event) =>
              setForm((current) => ({
                ...current,
                description: event.target.value,
              }))
            }
            placeholder="ใช้กับโปรเจกต์แบรนด์..."
          />
        </div>

        {(
          [
            ["primary", "Primary"],
            ["accent", "Accent"],
            ["background", "Background"],
            ["foreground", "Foreground"],
            ["canvas", "Canvas"],
            ["muted", "Muted"],
            ["border", "Border"],
          ] as const
        ).map(([key, label]) => (
          <div key={key}>
            <Label>{label}</Label>
            <ColorTray
              className="mt-1.5"
              label={label}
              value={form[key]}
              onChange={(color) =>
                setForm((current) => ({ ...current, [key]: color }))
              }
              options={PRESET_COLORS}
            />
          </div>
        ))}

        <div
          className="rounded-xl border border-slate-200 p-3"
          style={{
            background: form.canvas,
            color: form.foreground,
            borderColor: form.border,
          }}
        >
          <p className="text-xs font-medium opacity-70">ตัวอย่างพรีวิว</p>
          <p className="mt-1 text-sm font-semibold">{form.label || "ชื่อธีม"}</p>
          <div className="mt-2 flex gap-2">
            <span
              className="rounded-md px-2.5 py-1 text-xs font-medium text-white"
              style={{ backgroundColor: form.primary }}
            >
              Primary
            </span>
            <span
              className="rounded-md px-2.5 py-1 text-xs font-medium text-white"
              style={{ backgroundColor: form.accent }}
            >
              Accent
            </span>
            <span
              className="rounded-md px-2.5 py-1 text-xs font-medium"
              style={{ backgroundColor: form.muted, color: form.foreground }}
            >
              Muted
            </span>
          </div>
        </div>

        {previewIssues.length > 0 ? (
          <ul className="space-y-1 text-xs text-red-600">
            {previewIssues.map((issue) => (
              <li key={`${issue.path}-${issue.message}`}>
                {issue.path ? `${issue.path}: ` : ""}
                {issue.message}
              </li>
            ))}
          </ul>
        ) : null}

        <Button
          type="button"
          className="h-9"
          disabled={saving || !form.label.trim() || previewIssues.length > 0}
          onClick={() => void saveTheme()}
        >
          <LoadingButtonContent loading={saving} loadingText="กำลังบันทึก...">
            {editingId ? (
              <>
                <Check className="h-4 w-4" />
                บันทึกธีม
              </>
            ) : (
              <>
                <Plus className="h-4 w-4" />
                สร้างธีม
              </>
            )}
          </LoadingButtonContent>
        </Button>
      </div>
    </div>
  );
}
