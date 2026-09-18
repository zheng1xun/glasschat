import * as SecureStore from "expo-secure-store";

/**
 * 设备端 API 配置：API Key / Base URL / 模型。
 * 全部存在 iOS 钥匙串（Android Keystore）里，不出本机。
 * 界面用 useSyncExternalStore(subscribeApiConfig, getApiConfig) 订阅。
 */
export type ApiConfig = {
  apiKey: string;
  baseURL: string;
  model: string;
};

const STORE_KEYS = {
  apiKey: "gc_api_key",
  baseURL: "gc_base_url",
  model: "gc_model",
} as const;

export const DEFAULT_API_CONFIG: ApiConfig = {
  apiKey: "",
  baseURL: "https://api.deepseek.com/v1",
  model: "deepseek-chat",
};

export const MODEL_PRESETS = [
  { id: "deepseek-chat", label: "deepseek-chat", subtitle: "日常对话（V3）" },
  { id: "deepseek-reasoner", label: "deepseek-reasoner", subtitle: "深度思考（R1）" },
] as const;

let current: ApiConfig = { ...DEFAULT_API_CONFIG };
let hydrated = false;
const listeners = new Set<() => void>();

function emit() {
  listeners.forEach((listener) => listener());
}

export function getApiConfig(): ApiConfig {
  return current;
}

export function subscribeApiConfig(listener: () => void): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

export async function hydrateApiConfig(): Promise<void> {
  if (hydrated) return;
  hydrated = true;
  try {
    const [apiKey, baseURL, model] = await Promise.all([
      SecureStore.getItemAsync(STORE_KEYS.apiKey),
      SecureStore.getItemAsync(STORE_KEYS.baseURL),
      SecureStore.getItemAsync(STORE_KEYS.model),
    ]);
    current = {
      apiKey: apiKey ?? DEFAULT_API_CONFIG.apiKey,
      baseURL: baseURL ?? DEFAULT_API_CONFIG.baseURL,
      model: model ?? DEFAULT_API_CONFIG.model,
    };
    emit();
  } catch {
    // 读取失败就保持默认值，下次启动再试
    hydrated = false;
  }
}

export async function setApiConfig(patch: Partial<ApiConfig>): Promise<void> {
  current = { ...current, ...patch };
  emit();
  try {
    await Promise.all(
      (Object.keys(patch) as (keyof ApiConfig)[]).map((key) => {
        const value = current[key];
        return value
          ? SecureStore.setItemAsync(STORE_KEYS[key], value)
          : SecureStore.deleteItemAsync(STORE_KEYS[key]);
      }),
    );
  } catch {
    // 持久化失败不影响本次使用
  }
}

export function isApiConfigured(): boolean {
  return current.apiKey.trim().length > 0;
}
