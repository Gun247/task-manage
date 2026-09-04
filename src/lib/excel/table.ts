import fs from "node:fs";
import path from "node:path";
import * as XLSX from "xlsx";
import { getExcelFilePath } from "@/lib/db-config";

let writeChain: Promise<void> = Promise.resolve();

export function withExcelLock<T>(operation: () => T | Promise<T>): Promise<T> {
  const run = writeChain.then(operation);
  writeChain = run.then(
    () => undefined,
    () => undefined,
  );
  return run;
}

function readWorkbook() {
  const filePath = getExcelFilePath();
  if (!fs.existsSync(filePath)) {
    return XLSX.utils.book_new();
  }
  return XLSX.readFile(filePath);
}

function writeWorkbook(workbook: XLSX.WorkBook) {
  const filePath = getExcelFilePath();
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  XLSX.writeFile(workbook, filePath);
}

function toCellValue(value: unknown): string | number | boolean {
  if (value === null || value === undefined) return "";
  if (typeof value === "boolean") return value ? "TRUE" : "FALSE";
  return String(value);
}

function parseCellValue(
  value: unknown,
  key: string,
): string | number | boolean | null {
  if (value === undefined || value === null || value === "") {
    return key === "assigneeId" ? null : "";
  }
  if (value === "TRUE" || value === true) return true;
  if (value === "FALSE" || value === false) return false;
  if (key === "sortOrder") {
    const num = Number(value);
    return Number.isFinite(num) ? num : 0;
  }
  return String(value);
}

type RowRecord = Record<string, string | number | boolean | null>;

export class ExcelTable<T extends RowRecord> {
  constructor(
    private sheetName: string,
    private columns: (keyof T & string)[],
  ) {}

  private rowsFromSheet(sheet: XLSX.WorkSheet): T[] {
    const matrix = XLSX.utils.sheet_to_json<(string | number | boolean)[]>(sheet, {
      header: 1,
      defval: "",
      raw: false,
    }) as (string | number | boolean)[][];

    if (matrix.length <= 1) return [];

    const headers = matrix[0].map((value) => String(value ?? ""));

    return matrix
      .slice(1)
      .filter((row) => row[0])
      .map((row) => {
        const record = {} as Record<string, string | number | boolean | null>;
        for (const key of this.columns) {
          const index = headers.indexOf(key);
          record[key] =
            index >= 0
              ? parseCellValue(row[index], key)
              : key === "assigneeId"
                ? null
                : "";
        }
        return record as T;
      });
  }

  private writeRows(workbook: XLSX.WorkBook, rows: T[]) {
    const header = this.columns as string[];
    const data = [
      header,
      ...rows.map((row) => header.map((column) => toCellValue(row[column]))),
    ];
    const sheet = XLSX.utils.aoa_to_sheet(data);
    workbook.Sheets[this.sheetName] = sheet;
    if (!workbook.SheetNames.includes(this.sheetName)) {
      workbook.SheetNames.push(this.sheetName);
    }
  }

  async ensureHeader() {
    return withExcelLock(() => {
      const workbook = readWorkbook();
      if (!workbook.SheetNames.includes(this.sheetName)) {
        this.writeRows(workbook, []);
        writeWorkbook(workbook);
        return;
      }

      const sheet = workbook.Sheets[this.sheetName];
      if (!sheet) {
        this.writeRows(workbook, []);
        writeWorkbook(workbook);
        return;
      }

      const matrix = XLSX.utils.sheet_to_json<(string | number | boolean)[]>(sheet, {
        header: 1,
        defval: "",
        raw: false,
      }) as (string | number | boolean)[][];
      const headers = (matrix[0] ?? []).map((value) => String(value ?? ""));
      const needsMigrate =
        this.columns.length !== headers.length ||
        this.columns.some((column, index) => headers[index] !== column);

      if (needsMigrate) {
        const rows = this.rowsFromSheet(sheet);
        this.writeRows(workbook, rows);
        writeWorkbook(workbook);
      }
    });
  }

  async getAll(): Promise<T[]> {
    await this.ensureHeader();
    return withExcelLock(() => {
      const workbook = readWorkbook();
      const sheet = workbook.Sheets[this.sheetName];
      if (!sheet) return [];
      return this.rowsFromSheet(sheet);
    });
  }

  async findById(id: string): Promise<T | null> {
    const rows = await this.getAll();
    return rows.find((row) => row.id === id) ?? null;
  }

  async create(
    data: Omit<T, "createdAt" | "updatedAt"> & Partial<Pick<T, "createdAt" | "updatedAt">>,
  ): Promise<T> {
    await this.ensureHeader();
    const now = new Date().toISOString();
    const record = {
      ...data,
      createdAt: String(data.createdAt ?? now),
      updatedAt: String(data.updatedAt ?? now),
    } as unknown as T;

    return withExcelLock(() => {
      const workbook = readWorkbook();
      const sheet = workbook.Sheets[this.sheetName];
      const rows = sheet ? this.rowsFromSheet(sheet) : [];
      rows.push(record);
      this.writeRows(workbook, rows);
      writeWorkbook(workbook);
      return record;
    });
  }

  async update(id: string, data: Partial<T>): Promise<T> {
    return withExcelLock(() => {
      const workbook = readWorkbook();
      const sheet = workbook.Sheets[this.sheetName];
      const rows = sheet ? this.rowsFromSheet(sheet) : [];
      const index = rows.findIndex((row) => row.id === id);
      if (index === -1) {
        throw new Error(`Row not found: ${id}`);
      }

      const updated = {
        ...rows[index],
        ...data,
        id,
        updatedAt: new Date().toISOString(),
      } as T;
      rows[index] = updated;
      this.writeRows(workbook, rows);
      writeWorkbook(workbook);
      return updated;
    });
  }

  async updateMany(predicate: (row: T) => boolean, data: Partial<T>): Promise<number> {
    const rows = await this.getAll();
    const targets = rows.filter(predicate);
    for (const row of targets) {
      await this.update(String(row.id), data);
    }
    return targets.length;
  }

  async count(predicate?: (row: T) => boolean): Promise<number> {
    const rows = await this.getAll();
    if (!predicate) return rows.length;
    return rows.filter(predicate).length;
  }

  async delete(id: string): Promise<void> {
    await withExcelLock(() => {
      const workbook = readWorkbook();
      const sheet = workbook.Sheets[this.sheetName];
      const rows = sheet ? this.rowsFromSheet(sheet).filter((row) => row.id !== id) : [];
      this.writeRows(workbook, rows);
      writeWorkbook(workbook);
    });
  }

  async deleteWhere(predicate: (row: T) => boolean): Promise<number> {
    return withExcelLock(() => {
      const workbook = readWorkbook();
      const sheet = workbook.Sheets[this.sheetName];
      const rows = sheet ? this.rowsFromSheet(sheet) : [];
      const remaining = rows.filter((row) => !predicate(row));
      const removed = rows.length - remaining.length;
      this.writeRows(workbook, remaining);
      writeWorkbook(workbook);
      return removed;
    });
  }

  async findFirst(
    orderBy?: { key: keyof T; direction: "asc" | "desc" },
    predicate?: (row: T) => boolean,
  ): Promise<T | null> {
    let rows = await this.getAll();
    if (predicate) rows = rows.filter(predicate);
    if (orderBy) {
      rows.sort((a, b) => {
        const left = a[orderBy.key];
        const right = b[orderBy.key];
        if (left === right) return 0;
        if (left === null || left === undefined) return 1;
        if (right === null || right === undefined) return -1;
        const cmp = left < right ? -1 : 1;
        return orderBy.direction === "asc" ? cmp : -cmp;
      });
    }
    return rows[0] ?? null;
  }

  async maxOf(key: keyof T): Promise<number> {
    const rows = await this.getAll();
    return rows.reduce((max, row) => {
      const value = Number(row[key] ?? 0);
      return Number.isFinite(value) ? Math.max(max, value) : max;
    }, -1);
  }
}

export function createId() {
  return crypto.randomUUID();
}
