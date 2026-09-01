import { callAppsScript, useAppsScript } from "./apps-script-client";
import { getSheetsClient, getSpreadsheetId } from "./client";

type RowRecord = Record<string, string | number | boolean | null>;

function toCellValue(value: unknown): string {
  if (value === null || value === undefined) return "";
  if (typeof value === "boolean") return value ? "TRUE" : "FALSE";
  return String(value);
}

function parseCellValue(value: string | undefined, key: string): string | number | boolean | null {
  if (value === undefined || value === "") {
    return key === "assigneeId" ? null : "";
  }
  if (value === "TRUE") return true;
  if (value === "FALSE") return false;
  if (key === "sortOrder") {
    const num = Number(value);
    return Number.isFinite(num) ? num : 0;
  }
  return value;
}

export class SheetTable<T extends RowRecord> {
  constructor(
    private sheetName: string,
    private columns: (keyof T & string)[],
  ) {}

  private range(suffix = "A:Z") {
    return `'${this.sheetName}'!${suffix}`;
  }

  async ensureSheetExists() {
    if (useAppsScript()) {
      await callAppsScript("ensureStructure");
      return;
    }

    const sheets = await getSheetsClient();
    const spreadsheetId = getSpreadsheetId();
    const meta = await sheets.spreadsheets.get({ spreadsheetId });
    const exists = meta.data.sheets?.some(
      (sheet) => sheet.properties?.title === this.sheetName,
    );

    if (exists) return;

    await sheets.spreadsheets.batchUpdate({
      spreadsheetId,
      requestBody: {
        requests: [
          {
            addSheet: {
              properties: { title: this.sheetName },
            },
          },
        ],
      },
    });
  }

  async ensureHeader() {
    await this.ensureSheetExists();

    if (useAppsScript()) return;

    const sheets = await getSheetsClient();
    const spreadsheetId = getSpreadsheetId();
    const headerRange = this.range(`A1:${columnLetter(this.columns.length)}1`);
    const existing = await sheets.spreadsheets.values.get({
      spreadsheetId,
      range: headerRange,
    });

    if (!existing.data.values?.[0]?.length) {
      await sheets.spreadsheets.values.update({
        spreadsheetId,
        range: headerRange,
        valueInputOption: "RAW",
        requestBody: { values: [this.columns] },
      });
    }
  }

  private rowToRecord(row: string[]): T {
    const record = {} as Record<string, string | number | boolean | null>;
    for (let i = 0; i < this.columns.length; i++) {
      const key = this.columns[i];
      record[key] = parseCellValue(row[i], key);
    }
    return record as T;
  }

  private recordToRow(record: Partial<T>): string[] {
    return this.columns.map((column) => toCellValue(record[column]));
  }

  async getAll(): Promise<T[]> {
    await this.ensureHeader();

    if (useAppsScript()) {
      return callAppsScript<T[]>("getAll", { sheet: this.sheetName });
    }

    const sheets = await getSheetsClient();
    const spreadsheetId = getSpreadsheetId();
    const response = await sheets.spreadsheets.values.get({
      spreadsheetId,
      range: this.range(),
    });

    const rows = response.data.values ?? [];
    if (rows.length <= 1) return [];

    return rows.slice(1).filter((row) => row[0]).map((row) => this.rowToRecord(row));
  }

  async findById(id: string): Promise<T | null> {
    const rows = await this.getAll();
    return rows.find((row) => row.id === id) ?? null;
  }

  async create(data: Omit<T, "createdAt" | "updatedAt"> & Partial<Pick<T, "createdAt" | "updatedAt">>): Promise<T> {
    await this.ensureHeader();
    const now = new Date().toISOString();
    const record = {
      ...data,
      createdAt: String(data.createdAt ?? now),
      updatedAt: String(data.updatedAt ?? now),
    } as unknown as T;

    if (useAppsScript()) {
      return callAppsScript<T>("create", { sheet: this.sheetName, data: record });
    }

    const sheets = await getSheetsClient();
    const spreadsheetId = getSpreadsheetId();
    await sheets.spreadsheets.values.append({
      spreadsheetId,
      range: this.range(`A:${columnLetter(this.columns.length)}`),
      valueInputOption: "RAW",
      insertDataOption: "INSERT_ROWS",
      requestBody: { values: [this.recordToRow(record)] },
    });

    return record;
  }

  async update(id: string, data: Partial<T>): Promise<T> {
    if (useAppsScript()) {
      return callAppsScript<T>("update", { sheet: this.sheetName, id, data });
    }

    const sheets = await getSheetsClient();
    const spreadsheetId = getSpreadsheetId();
    const response = await sheets.spreadsheets.values.get({
      spreadsheetId,
      range: this.range(),
    });

    const rows = response.data.values ?? [];
    const rowIndex = rows.findIndex((row, index) => index > 0 && row[0] === id);
    if (rowIndex === -1) {
      throw new Error(`Row not found: ${id}`);
    }

    const current = this.rowToRecord(rows[rowIndex]);
    const updated = {
      ...current,
      ...data,
      id,
      updatedAt: new Date().toISOString(),
    } as T;

    const sheetRow = rowIndex + 1;
    await sheets.spreadsheets.values.update({
      spreadsheetId,
      range: this.range(`A${sheetRow}:${columnLetter(this.columns.length)}${sheetRow}`),
      valueInputOption: "RAW",
      requestBody: { values: [this.recordToRow(updated)] },
    });

    return updated;
  }

  async updateMany(
    predicate: (row: T) => boolean,
    data: Partial<T>,
  ): Promise<number> {
    const rows = await this.getAll();
    const targets = rows.filter(predicate);

    if (useAppsScript()) {
      let count = 0;
      for (const row of targets) {
        await this.update(String(row.id), data);
        count++;
      }
      return count;
    }

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
    if (useAppsScript()) {
      await callAppsScript("delete", { sheet: this.sheetName, id });
      return;
    }

    const sheets = await getSheetsClient();
    const spreadsheetId = getSpreadsheetId();
    const meta = await sheets.spreadsheets.get({ spreadsheetId });
    const sheet = meta.data.sheets?.find(
      (item) => item.properties?.title === this.sheetName,
    );
    const sheetId = sheet?.properties?.sheetId;
    if (sheetId === undefined) {
      throw new Error(`Sheet not found: ${this.sheetName}`);
    }

    const response = await sheets.spreadsheets.values.get({
      spreadsheetId,
      range: this.range(),
    });
    const rows = response.data.values ?? [];
    const rowIndex = rows.findIndex((row, index) => index > 0 && row[0] === id);
    if (rowIndex === -1) return;

    await sheets.spreadsheets.batchUpdate({
      spreadsheetId,
      requestBody: {
        requests: [
          {
            deleteDimension: {
              range: {
                sheetId,
                dimension: "ROWS",
                startIndex: rowIndex,
                endIndex: rowIndex + 1,
              },
            },
          },
        ],
      },
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

function columnLetter(count: number) {
  let result = "";
  let n = count;
  while (n > 0) {
    const rem = (n - 1) % 26;
    result = String.fromCharCode(65 + rem) + result;
    n = Math.floor((n - 1) / 26);
  }
  return result;
}

export function createId() {
  return crypto.randomUUID();
}
