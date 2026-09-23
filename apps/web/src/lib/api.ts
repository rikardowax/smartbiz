import { useAuthStore } from "@/stores/auth-store";

export interface ApiError {
  message: string;
  statusCode?: number;
}

/** Évite les refreshs concurrents quand plusieurs requêtes échouent ensemble. */
let refreshing: Promise<boolean> | null = null;

async function refreshAccessToken(): Promise<boolean> {
  const { refreshToken } = useAuthStore.getState();
  if (!refreshToken) return false;
  try {
    const res = await fetch("/api/v1/auth/refresh", {
      method: "POST",
      headers: { "Content-Type": "application/json", Accept: "application/json" },
      credentials: "include",
      body: JSON.stringify({ refreshToken }),
    });
    if (!res.ok) return false;
    const data = (await res.json()) as { accessToken: string; refreshToken: string };
    // On conserve l'utilisateur courant : la réponse de refresh n'inclut
    // pas les boutiques (contrairement à /auth/me).
    useAuthStore.setState({
      accessToken: data.accessToken,
      refreshToken: data.refreshToken,
    });
    return true;
  } catch {
    return false;
  }
}

export async function apiFetch<T = unknown>(
  path: string,
  options: RequestInit = {},
  allowRefresh = true,
): Promise<T> {
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

  // Token d'accès expiré (15 min) : on tente une rotation puis on rejoue
  // la requête une seule fois. Les endpoints d'authentification publiques
  // sont exclus pour ne pas transformer un mauvais mot de passe en
  // tentative de refresh (ni boucler sur /auth/refresh).
  const noRefresh = ["/auth/login", "/auth/register", "/auth/google", "/auth/refresh"].some((p) =>
    path.startsWith(p),
  );
  if (res.status === 401 && allowRefresh && !noRefresh) {
    refreshing ??= refreshAccessToken().finally(() => {
      refreshing = null;
    });
    if (await refreshing) {
      return apiFetch(path, options, false);
    }
    useAuthStore.getState().logout();
    if (typeof window !== "undefined" && !window.location.pathname.includes("/login")) {
      window.location.href = "/login";
    }
  }

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
