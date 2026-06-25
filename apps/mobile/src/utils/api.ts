import { Platform } from "react-native";

export const API_URL = Platform.select({
  android: "http://10.0.2.2:5000/api",
  default: "http://localhost:5000/api",
});

export const WS_URL = Platform.select({
  android: "ws://10.0.2.2:5000",
  default: "ws://localhost:5000",
});

let tokenMemory: string | null = null;

export const setToken = (token: string | null) => {
  tokenMemory = token;
  if (Platform.OS === "web") {
    try {
      if (token) {
        localStorage.setItem("talksy_token", token);
      } else {
        localStorage.removeItem("talksy_token");
      }
    } catch {}
  }
};

export const getToken = (): string | null => {
  if (Platform.OS === "web") {
    try {
      return localStorage.getItem("talksy_token") || tokenMemory;
    } catch {
      return tokenMemory;
    }
  }
  return tokenMemory;
};

export const apiRequest = async <T>(
  path: string,
  options: RequestInit = {}
): Promise<T> => {
  const token = getToken();
  const headers = new Headers(options.headers);

  if (token) {
    headers.set("Authorization", `Bearer ${token}`);
  }

  const isFormData = options.body && typeof options.body === "object" && (options.body instanceof FormData || typeof (options.body as any).append === "function");
  if (!isFormData && !headers.has("Content-Type")) {
    headers.set("Content-Type", "application/json");
  }

  const response = await fetch(`${API_URL}${path}`, {
    ...options,
    headers,
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.error || `HTTP error! status: ${response.status}`);
  }

  return response.json() as Promise<T>;
};
