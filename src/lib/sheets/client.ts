import type { sheets_v4 } from "googleapis";

const SCOPES = ["https://www.googleapis.com/auth/spreadsheets"];

function getCredentials() {
  const json = process.env.GOOGLE_SERVICE_ACCOUNT_JSON;
  if (json) {
    return JSON.parse(json) as {
      client_email: string;
      private_key: string;
    };
  }

  const email = process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL;
  const privateKey = process.env.GOOGLE_PRIVATE_KEY?.replace(/\\n/g, "\n");

  if (!email || !privateKey) {
    throw new Error(
      "Missing Google credentials. Set GOOGLE_APPS_SCRIPT_URL (recommended) or GOOGLE_SERVICE_ACCOUNT_JSON.",
    );
  }

  return { client_email: email, private_key: privateKey };
}

export function getSpreadsheetId() {
  const id = process.env.GOOGLE_SHEETS_ID;
  if (!id) {
    throw new Error("Missing GOOGLE_SHEETS_ID environment variable.");
  }
  return id;
}

let sheetsClient: sheets_v4.Sheets | null = null;

export async function getSheetsClient() {
  if (!sheetsClient) {
    const { google } = await import("googleapis");
    const auth = new google.auth.GoogleAuth({
      credentials: getCredentials(),
      scopes: SCOPES,
    });
    sheetsClient = google.sheets({ version: "v4", auth });
  }
  return sheetsClient;
}
