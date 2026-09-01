export async function fetchJson<T>(url: string, init?: RequestInit): Promise<T> {
  const response = await fetch(url, init);
  const data = await response.json();

  if (!response.ok) {
    throw new Error(
      typeof data?.error === "string" ? data.error : "Request failed",
    );
  }

  return data as T;
}

export async function fetchJsonArray<T>(url: string, init?: RequestInit): Promise<T[]> {
  const data = await fetchJson<T[] | { error?: string }>(url, init);
  if (!Array.isArray(data)) {
    throw new Error("Invalid response from server");
  }
  return data;
}
