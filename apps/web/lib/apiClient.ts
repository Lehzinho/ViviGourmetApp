import axios, { type AxiosError, type InternalAxiosRequestConfig } from "axios";

const ACCESS_STORAGE_KEY = "vivi_gourmet_access_token";
const REFRESH_STORAGE_KEY = "vivi_gourmet_refresh_token";

export function getStoredAccessToken(): string | null {
  if (typeof window === "undefined") return null;
  return localStorage.getItem(ACCESS_STORAGE_KEY);
}

export function setStoredTokens(access: string, refresh?: string): void {
  localStorage.setItem(ACCESS_STORAGE_KEY, access);
  if (refresh) localStorage.setItem(REFRESH_STORAGE_KEY, refresh);
}

export function clearStoredTokens(): void {
  localStorage.removeItem(ACCESS_STORAGE_KEY);
  localStorage.removeItem(REFRESH_STORAGE_KEY);
}

const baseURL =
  typeof window !== "undefined"
    ? (process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3001")
    : process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3001";

export const apiClient = axios.create({
  baseURL,
  headers: { "Content-Type": "application/json" },
  timeout: 30_000,
});

let refreshPromise: Promise<string | null> | null = null;

async function refreshAccessToken(): Promise<string | null> {
  if (typeof window === "undefined") return null;
  const refresh = localStorage.getItem(REFRESH_STORAGE_KEY);
  if (!refresh) return null;

  try {
    const { data } = await axios.post<{ accessToken: string }>(
      `${baseURL}/auth/refresh`,
      { refreshToken: refresh },
      { headers: { "Content-Type": "application/json" } },
    );
    const access = data.accessToken;
    localStorage.setItem(ACCESS_STORAGE_KEY, access);
    return access;
  } catch {
    clearStoredTokens();
    return null;
  }
}

apiClient.interceptors.request.use(
  (config: InternalAxiosRequestConfig) => {
    const token = getStoredAccessToken();
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error),
);

apiClient.interceptors.response.use(
  (response) => response,
  async (error: AxiosError) => {
    const original = error.config as InternalAxiosRequestConfig & { _retry?: boolean };
    if (error.response?.status === 401 && original && !original._retry) {
      original._retry = true;
      refreshPromise ??= refreshAccessToken();
      const newAccess = await refreshPromise;
      refreshPromise = null;

      if (newAccess) {
        original.headers.Authorization = `Bearer ${newAccess}`;
        return apiClient(original);
      }
    }
    return Promise.reject(error);
  },
);
