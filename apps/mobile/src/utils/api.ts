import { Platform } from "react-native";
import Constants from "expo-constants";

export const API_URL = (() => {
  const envUrl = process.env.EXPO_PUBLIC_API_URL || "";
  if (Platform.OS !== "web" && envUrl.includes("localhost")) {
    const hostUri = Constants.expoConfig?.hostUri;
    if (hostUri) {
      const ip = hostUri.split(":")[0];
      return envUrl.replace("localhost", ip);
    }
    return envUrl.replace("localhost", "10.0.2.2");
  }
  return envUrl;
})();

export const WS_URL = (() => {
  const base = API_URL.replace("/api", "");
  const wsBase = base.endsWith("/") ? base : `${base}/`;
  if (wsBase.startsWith("https://")) {
    return wsBase.replace("https://", "wss://");
  }
  return wsBase.replace("http://", "ws://");
})();

export const getImageUrl = (path?: string): string | undefined => {
  if (!path) return undefined;
  if (
    path.startsWith("http://") ||
    path.startsWith("https://") ||
    path.startsWith("data:") ||
    path.startsWith("blob:")
  ) {
    return path;
  }
  const apiBase = API_URL.replace("/api", "");
  return `${apiBase}${path}`;
};

let AsyncStorage: any = null;
try {
  AsyncStorage = require("@react-native-async-storage/async-storage").default;
} catch { }

let tokenMemory: string | null = null;

interface FormDataLike {
  append: (...args: unknown[]) => void;
}

export const initToken = async (): Promise<void> => {
  if (Platform.OS !== "web" && AsyncStorage) {
    try {
      const token = await AsyncStorage.getItem("talksy_token");
      if (token) {
        tokenMemory = token;
      }
    } catch { }
  }
};

export const setToken = (token: string | null) => {
  tokenMemory = token;
  if (Platform.OS === "web") {
    try {
      if (token) {
        localStorage.setItem("talksy_token", token);
      } else {
        localStorage.removeItem("talksy_token");
      }
    } catch { }
  } else if (AsyncStorage) {
    try {
      if (token) {
        AsyncStorage.setItem("talksy_token", token);
      } else {
        AsyncStorage.removeItem("talksy_token");
      }
    } catch { }
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

  headers.set("X-Tunnel-Skip-AntiPhishing-Page", "true");

  const method = options.method?.toUpperCase() || "GET";
  let body = options.body;
  if ((method === "POST" || method === "PUT" || method === "PATCH") && !body) {
    body = JSON.stringify({});
  }

  const isFormData = typeof body === "object" && body !== null && (
    body instanceof FormData ||
    typeof (body as FormDataLike).append === "function"
  );
  if (body && !isFormData && !headers.has("Content-Type")) {
    headers.set("Content-Type", "application/json");
  }

  const response = await fetch(`${API_URL}${path}`, {
    ...options,
    body,
    headers,
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.error || `HTTP error! status: ${response.status}`);
  }

  return response.json() as Promise<T>;
};
