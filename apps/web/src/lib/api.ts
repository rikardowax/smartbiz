import { useAuthStore } from "@/stores/auth-store";

export interface ApiError {
  message: string;
  statusCode?: number;
}

export async function apiFetch<T = unknown>(path: string, options: RequestInit = {}): Promise<T> {
  const { accessToken } = useAuthStore.getState();
  const headers: Record<string, string> = {
    Accept: "application/json",
    ...(options.headers as Record<string, string> | undefined),
  };

  if (options.body && typeof options.body === "string") {
    headers["Content-Type"] = "application/json";
  }

  if (accessToken) {
    headers.Authorization = `Bearer ${accessToken}`;
  }

  const res = await fetch(`/api/v1${path}`, {
    ...options,
    headers,
    credentials: "include",
  });

  if (!res.ok) {
    const body = await res.json().catch(() => ({ message: "Network error" }));
    const error = new Error(body.message || `HTTP ${res.status}`) as Error & {
      statusCode: number;
    };
    error.statusCode = res.status;
    throw error;
  }

  return res.json() as Promise<T>;
}
