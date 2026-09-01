import path from "node:path";

export type DatabaseMode = "sqlite" | "sheets" | "excel";

export function isSheetsConfigured() {
  if (process.env.GOOGLE_APPS_SCRIPT_URL) return true;
  if (process.env.GOOGLE_SERVICE_ACCOUNT_JSON) return true;
  if (process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL && process.env.GOOGLE_PRIVATE_KEY) {
    return true;
  }
  return false;
}

export function getExcelFilePath() {
  const filePath = process.env.EXCEL_FILE_PATH ?? "./data/taskDB.xlsx";
  if (path.isAbsolute(filePath)) return filePath;
  return path.join(process.cwd(), filePath);
}

export function getDatabaseMode(): DatabaseMode {
  const preference = process.env.DATABASE_MODE?.toLowerCase();
  if (preference === "sqlite") return "sqlite";
  if (preference === "excel" || preference === "xlsx" || preference === "xls") {
    return "excel";
  }
  if (preference === "sheets") return "sheets";
  return isSheetsConfigured() ? "sheets" : "sqlite";
}

export function getSheetsSetupHint() {
  return [
    "ตั้งค่า Google Sheets สำหรับ local:",
    "1. เปิด spreadsheet > Extensions > Apps Script",
    "2. วางโค้ดจาก google-apps-script/Code.gs",
    "3. Deploy > New deployment > Web app (Execute as: Me, Access: Anyone)",
    "4. ใส่ URL ใน .env.local เป็น GOOGLE_APPS_SCRIPT_URL",
    "5. รัน npm run sheets:init",
  ].join("\n");
}
