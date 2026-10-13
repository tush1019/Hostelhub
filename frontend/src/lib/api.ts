/* Shared API helper — all backend calls go through here. */

export const API_BASE_URL =
  import.meta.env.VITE_API_URL ||
  (typeof window !== "undefined" && window.location.hostname !== "localhost"
    ? "https://hostle-management-system.onrender.com/api"
    : "http://localhost:5000/api");

type ApiOptions = {
  method?: "GET" | "POST" | "PUT" | "PATCH" | "DELETE";
  body?: unknown;
};

export async function api<T>(path: string, options: ApiOptions = {}): Promise<T> {
  const response = await fetch(`${API_BASE_URL}${path}`, {
    method: options.method || "GET",
    headers: { "Content-Type": "application/json" },
    body: options.body !== undefined ? JSON.stringify(options.body) : undefined,
  });

  let data: {
    success?: boolean;
    message?: string;
    data?: T;
  } & T;

  try {
    data = await response.json();
  } catch {
    throw new Error("Server returned an invalid response.");
  }

  if (!response.ok || data.success === false) {
    throw new Error(data.message || `Request failed (${response.status})`);
  }

  // Endpoints return { success, data } or { success, data, summary }.
  // If `data` key exists use it, otherwise the whole payload is the result.
  if (data && typeof data === "object" && "data" in data) {
    return data.data as T;
  }

  return data as T;
}

/* Raw fetch for endpoints with extra fields (e.g. fees summary) */
export async function apiRaw<T>(path: string, options: ApiOptions = {}): Promise<T> {
  const response = await fetch(`${API_BASE_URL}${path}`, {
    method: options.method || "GET",
    headers: { "Content-Type": "application/json" },
    body: options.body !== undefined ? JSON.stringify(options.body) : undefined,
  });

  let data: T & { success?: boolean; message?: string };

  try {
    data = await response.json();
  } catch {
    throw new Error("Server returned an invalid response.");
  }

  if (!response.ok || data.success === false) {
    throw new Error(data.message || `Request failed (${response.status})`);
  }

  return data;
}

export function getStoredUser(): { id: number; name: string; email: string; role: string } | null {
  try {
    const raw = localStorage.getItem("hostelUser");
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}
