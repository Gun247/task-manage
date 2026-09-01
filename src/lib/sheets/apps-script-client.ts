type AppsScriptResponse<T> = { ok: true; data: T } | { ok: false; error: string };

function getAppsScriptUrl() {
  const url = process.env.GOOGLE_APPS_SCRIPT_URL;
  if (!url) {
    throw new Error(
      "Missing GOOGLE_APPS_SCRIPT_URL. Deploy google-apps-script/Code.gs and paste the Web App URL.",
    );
  }
  return url;
}

export function useAppsScript() {
  return Boolean(process.env.GOOGLE_APPS_SCRIPT_URL);
}

export async function callAppsScript<T>(
  action: string,
  payload: Record<string, unknown> = {},
): Promise<T> {
  const response = await fetch(getAppsScriptUrl(), {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ action, payload }),
    cache: "no-store",
    redirect: "follow",
  });

  const text = await response.text();
  let body: AppsScriptResponse<T>;
  try {
    body = JSON.parse(text) as AppsScriptResponse<T>;
  } catch {
    throw new Error(
      `Apps Script response invalid (HTTP ${response.status}). ตรวจสอบว่า Deploy เป็น Web app แล้วและตั้ง Access เป็น Anyone.`,
    );
  }

  if (!body.ok) {
    throw new Error("error" in body ? body.error : "Apps Script request failed");
  }
  return body.data;
}
