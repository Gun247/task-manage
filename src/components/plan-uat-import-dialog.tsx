"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { Download } from "lucide-react";
import { Button } from "@/components/ui/button";
import { DateInput } from "@/components/ui/date-input";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Select } from "@/components/ui/input";
import { Loading } from "@/components/ui/loading";
import type { PlanUatDateField } from "@/lib/plan-uat-import";
import type { Status } from "@/lib/types";
import { cn, formatDate } from "@/lib/utils";

interface PreviewItem {
  name: string;
  section: string;
  uatDate: string | null;
  prdDate: string | null;
  sheetRow: number;
  alreadyExists: boolean;
}

interface PreviewRow extends PreviewItem {
  selected: boolean;
  statusId: string;
}

interface PreviewQuery {
  dateFrom: string;
  dateTo: string;
  dateField: PlanUatDateField;
}

interface PlanUatImportDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  projectId: string;
  statuses: Status[];
  onImported: (message: string) => void;
}

const dateFieldOptions: { value: PlanUatDateField; label: string }[] = [
  { value: "either", label: "UAT หรือ PRD" },
  { value: "uat", label: "วันที่ UAT" },
  { value: "prd", label: "วันที่ PRD" },
];

function toIsoDate(date: Date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function currentMonthRange() {
  const now = new Date();
  return {
    from: toIsoDate(new Date(now.getFullYear(), now.getMonth(), 1)),
    to: toIsoDate(new Date(now.getFullYear(), now.getMonth() + 1, 0)),
  };
}

export function PlanUatImportDialog({
  open,
  onOpenChange,
  projectId,
  statuses,
  onImported,
}: PlanUatImportDialogProps) {
  const month = currentMonthRange();
  const [dateFrom, setDateFrom] = useState(month.from);
  const [dateTo, setDateTo] = useState(month.to);
  const [dateField, setDateField] = useState<PlanUatDateField>("either");
  const [rows, setRows] = useState<PreviewRow[]>([]);
  const [previewQuery, setPreviewQuery] = useState<PreviewQuery | null>(null);
  const [sourceCount, setSourceCount] = useState(0);
  const [previewing, setPreviewing] = useState(false);
  const [importing, setImporting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [bulkStatusId, setBulkStatusId] = useState("");

  useEffect(() => {
    if (!open) return;
    const range = currentMonthRange();
    setDateFrom(range.from);
    setDateTo(range.to);
    setDateField("either");
    setRows([]);
    setPreviewQuery(null);
    setSourceCount(0);
    setError(null);
    setBulkStatusId("");
    setPreviewing(false);
    setImporting(false);
  }, [open]);

  const previewStale =
    previewQuery !== null &&
    (previewQuery.dateFrom !== dateFrom ||
      previewQuery.dateTo !== dateTo ||
      previewQuery.dateField !== dateField);

  const newRows = rows.filter((row) => !row.alreadyExists);
  const selectedRows = newRows.filter((row) => row.selected);
  const allNewSelected =
    newRows.length > 0 && selectedRows.length === newRows.length;

  const selectAllRef = useRef<HTMLInputElement>(null);
  useEffect(() => {
    if (!selectAllRef.current) return;
    selectAllRef.current.indeterminate =
      selectedRows.length > 0 && !allNewSelected;
  }, [selectedRows.length, allNewSelected]);

  const statusName = useMemo(() => {
    return new Map(statuses.map((status) => [status.id, status]));
  }, [statuses]);

  function updateRow(name: string, patch: Partial<PreviewRow>) {
    setRows((current) =>
      current.map((row) => (row.name === name ? { ...row, ...patch } : row)),
    );
  }

  function toggleAllNew(selected: boolean) {
    setRows((current) =>
      current.map((row) =>
        row.alreadyExists ? row : { ...row, selected },
      ),
    );
  }

  function applyBulkStatus(statusId: string) {
    if (!statusId) return;
    if (selectedRows.length === 0) {
      setError("เลือกรายการที่ต้องการเปลี่ยนสถานะก่อน");
      setBulkStatusId("");
      return;
    }
    setError(null);
    setRows((current) =>
      current.map((row) =>
        row.selected && !row.alreadyExists ? { ...row, statusId } : row,
      ),
    );
    setBulkStatusId("");
  }

  async function handlePreview() {
    if (!projectId || previewing) return;
    if (!dateFrom && !dateTo) {
      setError("กรุณาเลือกช่วงวันที่");
      return;
    }
    if (dateFrom && dateTo && dateFrom > dateTo) {
      setError("วันเริ่มต้องไม่เกินวันสิ้นสุด");
      return;
    }

    setPreviewing(true);
    setError(null);

    try {
      const response = await fetch("/api/tasks/import-plan-uat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          projectId,
          preview: true,
          dateFrom: dateFrom || null,
          dateTo: dateTo || null,
          dateField,
        }),
      });
      const data = (await response.json()) as {
        error?: string;
        sourceCount?: number;
        defaultStatusId?: string;
        items?: PreviewItem[];
      };

      if (!response.ok) {
        setError(data.error ?? "ดูตัวอย่างจาก Plan UAT ไม่สำเร็จ");
        return;
      }

      const fallbackStatusId =
        data.defaultStatusId && statusName.has(data.defaultStatusId)
          ? data.defaultStatusId
          : (statuses[0]?.id ?? "");

      setSourceCount(data.sourceCount ?? 0);
      setRows(
        (data.items ?? []).map((item) => ({
          ...item,
          selected: !item.alreadyExists,
          statusId: fallbackStatusId,
        })),
      );
      setPreviewQuery({ dateFrom, dateTo, dateField });
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "ดูตัวอย่างจาก Plan UAT ไม่สำเร็จ",
      );
    } finally {
      setPreviewing(false);
    }
  }

  async function handleImport() {
    if (!projectId || importing || previewStale) return;
    if (selectedRows.length === 0) {
      setError("เลือกรายการที่ต้องการนำเข้าอย่างน้อย 1 รายการ");
      return;
    }
    if (selectedRows.some((row) => !row.statusId)) {
      setError("กรุณาเลือกสถานะให้ครบทุกรายการ");
      return;
    }

    setImporting(true);
    setError(null);

    try {
      const response = await fetch("/api/tasks/import-plan-uat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          projectId,
          items: selectedRows.map((row) => ({
            name: row.name,
            statusId: row.statusId,
          })),
        }),
      });
      const data = (await response.json()) as {
        error?: string;
        imported?: number;
        skipped?: number;
        missing?: number;
      };

      if (!response.ok) {
        setError(data.error ?? "นำเข้ารายการจาก Plan UAT ไม่สำเร็จ");
        return;
      }

      const imported = data.imported ?? 0;
      const skipped = data.skipped ?? 0;
      const missing = data.missing ?? 0;
      onImported(
        `เพิ่ม ${imported.toLocaleString("th-TH")} รายการ · ข้าม ${skipped.toLocaleString("th-TH")} รายการที่มีอยู่แล้ว${
          missing
            ? ` · ไม่พบในชีท ${missing.toLocaleString("th-TH")} รายการ`
            : ""
        }`,
      );
      onOpenChange(false);
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "นำเข้ารายการจาก Plan UAT ไม่สำเร็จ",
      );
    } finally {
      setImporting(false);
    }
  }

  const busy = previewing || importing;

  return (
    <Dialog open={open} onOpenChange={(next) => !busy && onOpenChange(next)}>
      <DialogContent className="flex max-h-[min(92vh,880px)] w-[calc(100%-1.5rem)] max-w-5xl flex-col gap-0 overflow-hidden p-0">
        <DialogHeader className="shrink-0 px-6 pt-6 pr-12">
          <DialogTitle>ดึงจาก Plan UAT</DialogTitle>
          <DialogDescription>
            เลือกช่วงวันที่ ดูตัวอย่าง แล้วปรับสถานะก่อนนำเข้าเป็น task
            รายการที่มีชื่อซ้ำจะไม่ถูกแก้
          </DialogDescription>
        </DialogHeader>

        <div className="shrink-0 px-6 pt-4">
          <div className="grid gap-3 sm:grid-cols-[minmax(0,1fr)_minmax(0,1fr)_minmax(0,11rem)_auto] sm:items-end">
            <DateInput
              id="plan-uat-from"
              label="จากวันที่"
              compact
              value={dateFrom}
              onChange={(event) => setDateFrom(event.target.value)}
              disabled={busy}
            />
            <DateInput
              id="plan-uat-to"
              label="ถึงวันที่"
              compact
              value={dateTo}
              onChange={(event) => setDateTo(event.target.value)}
              disabled={busy}
            />
            <div>
              <label
                htmlFor="plan-uat-field"
                className="mb-1 block text-[11px] font-medium tracking-wide text-slate-500 uppercase"
              >
                ใช้วันที่
              </label>
              <Select
                id="plan-uat-field"
                className="h-9 py-0 text-sm leading-9"
                value={dateField}
                disabled={busy}
                onChange={(event) =>
                  setDateField(event.target.value as PlanUatDateField)
                }
              >
                {dateFieldOptions.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </Select>
            </div>
            <Button
              type="button"
              variant="outline"
              className="h-9"
              onClick={() => void handlePreview()}
              disabled={busy || !projectId}
            >
              <Download className="h-4 w-4" />
              {previewing ? "กำลังดึง..." : "ดูตัวอย่าง"}
            </Button>
          </div>
        </div>

        {error ? (
          <p className="mx-6 mt-3 shrink-0 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-900">
            {error}
          </p>
        ) : null}

        {previewStale ? (
          <p className="mx-6 mt-3 shrink-0 rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-600">
            ช่วงวันที่เปลี่ยนแล้ว กดดูตัวอย่างอีกครั้งก่อนนำเข้า
          </p>
        ) : null}

        <div className="min-h-0 flex-1 overflow-auto px-6 py-4">
          {previewing ? (
            <div className="flex min-h-48 items-center justify-center">
              <Loading label="กำลังดึงจากชีท Plan UAT..." />
            </div>
          ) : previewQuery === null ? (
            <div className="flex min-h-48 items-center justify-center rounded-xl border border-dashed border-slate-200 px-6 text-center text-sm text-slate-500">
              เลือกช่วงวันที่ แล้วกดดูตัวอย่าง
              รายการที่วันที่ UAT หรือ PRD อยู่ในช่วงจะแสดงในตาราง
            </div>
          ) : rows.length === 0 ? (
            <div className="flex min-h-48 items-center justify-center rounded-xl border border-dashed border-slate-200 px-6 text-center text-sm text-slate-500">
              ไม่พบรายการในช่วงนี้ จากทั้งหมด{" "}
              {sourceCount.toLocaleString("th-TH")} รายการในชีท
            </div>
          ) : (
            <div className="overflow-auto rounded-xl border border-slate-200">
              <table className="w-full table-fixed border-collapse text-sm">
                <thead className="sticky top-0 z-10 bg-slate-50 text-left text-xs font-medium tracking-wide text-slate-500 uppercase">
                  <tr>
                    <th className="w-10 px-3 py-2">
                      <input
                        ref={selectAllRef}
                        type="checkbox"
                        className="h-4 w-4 accent-primary"
                        checked={allNewSelected}
                        disabled={newRows.length === 0 || busy}
                        aria-label="เลือกรายการใหม่ทั้งหมด"
                        onChange={(event) => toggleAllNew(event.target.checked)}
                      />
                    </th>
                    <th className="px-3 py-2">งาน</th>
                    <th className="w-[22%] px-3 py-2">ช่วงในชีท</th>
                    <th className="w-24 px-3 py-2">UAT</th>
                    <th className="w-24 px-3 py-2">PRD</th>
                    <th className="w-40 px-3 py-2">สถานะ</th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map((row) => {
                    const status = statusName.get(row.statusId);
                    return (
                      <tr
                        key={`${row.sheetRow}-${row.name}`}
                        className={cn(
                          "border-t border-slate-100",
                          row.alreadyExists && "bg-slate-50 text-slate-400",
                        )}
                      >
                        <td className="px-3 py-2 align-middle">
                          <input
                            type="checkbox"
                            className="h-4 w-4 accent-primary"
                            checked={row.selected && !row.alreadyExists}
                            disabled={row.alreadyExists || busy || previewStale}
                            aria-label={`เลือก ${row.name}`}
                            onChange={(event) =>
                              updateRow(row.name, {
                                selected: event.target.checked,
                              })
                            }
                          />
                        </td>
                        <td className="px-3 py-2 align-middle">
                          <p
                            className={cn(
                              "font-medium break-words",
                              row.alreadyExists
                                ? "text-slate-500"
                                : "text-slate-800",
                            )}
                          >
                            {row.name}
                          </p>
                          {row.alreadyExists ? (
                            <p className="text-xs text-slate-400">มีอยู่แล้ว</p>
                          ) : null}
                        </td>
                        <td
                          className="truncate px-3 py-2 align-middle text-slate-600"
                          title={row.section}
                        >
                          {row.section || "-"}
                        </td>
                        <td className="px-3 py-2 align-middle whitespace-nowrap">
                          {formatDate(row.uatDate)}
                        </td>
                        <td className="px-3 py-2 align-middle whitespace-nowrap">
                          {formatDate(row.prdDate)}
                        </td>
                        <td className="px-3 py-2 align-middle">
                          {row.alreadyExists ? (
                            <span className="text-xs">ไม่นำเข้า</span>
                          ) : (
                            <span className="flex items-center gap-2">
                              <span
                                className="h-2.5 w-2.5 shrink-0 rounded-full"
                                style={{
                                  backgroundColor: status?.color ?? "#94a3b8",
                                }}
                              />
                              <Select
                                className="h-8 w-full py-0 text-xs leading-8"
                                value={row.statusId}
                                disabled={busy || previewStale}
                                aria-label={`สถานะของ ${row.name}`}
                                onChange={(event) =>
                                  updateRow(row.name, {
                                    statusId: event.target.value,
                                  })
                                }
                              >
                                {statuses.map((item) => (
                                  <option key={item.id} value={item.id}>
                                    {item.name}
                                  </option>
                                ))}
                              </Select>
                            </span>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>

        <div className="flex shrink-0 flex-col gap-3 border-t border-slate-200 px-6 py-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex flex-wrap items-center gap-2">
            <Select
              className="h-9 w-full py-0 text-sm leading-9 sm:w-56"
              value={bulkStatusId}
              disabled={busy || previewStale || selectedRows.length === 0}
              aria-label="ตั้งสถานะให้รายการที่เลือก"
              onChange={(event) => {
                const value = event.target.value;
                setBulkStatusId(value);
                applyBulkStatus(value);
              }}
            >
              <option value="">ตั้งสถานะให้ที่เลือก</option>
              {statuses.map((status) => (
                <option key={status.id} value={status.id}>
                  {status.name}
                </option>
              ))}
            </Select>
            <p className="text-xs text-slate-500">
              เลือก {selectedRows.length.toLocaleString("th-TH")} จาก{" "}
              {newRows.length.toLocaleString("th-TH")} รายการใหม่
              {previewQuery
                ? ` · ในชีท ${sourceCount.toLocaleString("th-TH")}`
                : ""}
            </p>
          </div>
          <div className="flex justify-end gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={busy}
            >
              ยกเลิก
            </Button>
            <Button
              type="button"
              onClick={() => void handleImport()}
              disabled={
                busy ||
                previewStale ||
                previewQuery === null ||
                selectedRows.length === 0
              }
            >
              {importing
                ? "กำลังนำเข้า..."
                : `นำเข้า ${selectedRows.length.toLocaleString("th-TH")} รายการ`}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
