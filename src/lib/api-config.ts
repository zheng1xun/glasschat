import * as SecureStore from "expo-secure-store";

/**
 * 设备端配置：服务商 / API Key / 模型 / 搜索引擎。
 * 全部存在 iOS 钥匙串（Android Keystore）里，不出本机。
 * 界面用 useSyncExternalStore(subscribeApiConfig, getApiConfig) 订阅。
 */
export type ApiConfig = {
  apiKey: string;
  baseURL: string;
  model: string;
  /** 当前选中的服务商预设 id（custom = 自定义） */
  providerId: string;
  /** 搜索引擎：none | tavily | bocha | searxng | bing */
  searchProvider: string;
  searchApiKey: string;
  /** SearXNG 自建实例地址 */
  searchEndpoint: string;
  /** 输入区「智能搜索」开关 */
  webSearchEnabled: boolean;
};

const STORE_KEYS = {
  apiKey: "gc_api_key",
  baseURL: "gc_base_url",
  model: "gc_model",
  providerId: "gc_provider_id",
  searchProvider: "gc_search_provider",
  searchApiKey: "gc_search_api_key",
  searchEndpoint: "gc_search_endpoint",
  webSearchEnabled: "gc_web_search_enabled",
} as const;

export const DEFAULT_API_CONFIG: ApiConfig = {
  apiKey: "",
  baseURL: "https://api.deepseek.com/v1",
  model: "deepseek-chat",
  providerId: "deepseek",
  searchProvider: "none",
  searchApiKey: "",
  searchEndpoint: "",
  webSearchEnabled: false,
};

/** OpenAI 兼容协议的服务商预设（覆盖绝大多数主流厂商）。 */
export const PROVIDER_PRESETS = [
  {
    id: "deepseek",
    label: "DeepSeek",
    baseURL: "https://api.deepseek.com/v1",
    models: ["deepseek-chat", "deepseek-reasoner"],
  },
  {
    id: "openai",
    label: "OpenAI",
    baseURL: "https://api.openai.com/v1",
    models: ["gpt-4o", "gpt-4o-mini"],
  },
  {
    id: "qwen",
    label: "阿里百炼",
    baseURL: "https://dashscope.aliyuncs.com/compatible-mode/v1",
    models: ["qwen-max", "qwen-plus"],
  },
  {
    id: "moonshot",
    label: "Kimi",
    baseURL: "https://api.moonshot.cn/v1",
    models: ["kimi-k2-0905-preview", "moonshot-v1-8k"],
  },
  {
    id: "zhipu",
    label: "智谱 GLM",
    baseURL: "https://open.bigmodel.cn/api/paas/v4",
    models: ["glm-4.5", "glm-4.5-air"],
  },
  {
    id: "siliconflow",
    label: "硅基流动",
    baseURL: "https://api.siliconflow.cn/v1",
    models: ["deepseek-ai/DeepSeek-V3", "Qwen/Qwen2.5-7B-Instruct"],
  },
  {
    id: "openrouter",
    label: "OpenRouter",
    baseURL: "https://openrouter.ai/api/v1",
    models: ["openai/gpt-4o", "anthropic/claude-sonnet-4.5"],
  },
  {
    id: "groq",
    label: "Groq",
    baseURL: "https://api.groq.com/openai/v1",
    models: ["llama-3.3-70b-versatile"],
  },
  {
    id: "ollama",
    label: "Ollama 本地",
    baseURL: "http://192.168.1.100:11434/v1",
    models: ["qwen3:8b"],
  },
  { id: "custom", label: "自定义", baseURL: "", models: [] },
] as const;

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
    const keys = Object.keys(STORE_KEYS) as (keyof ApiConfig)[];
    const values = await Promise.all(
      keys.map((key) => SecureStore.getItemAsync(STORE_KEYS[key])),
    );
    const stored: Partial<Record<keyof ApiConfig, string>> = {};
    keys.forEach((key, i) => {
      if (values[i] != null) stored[key] = values[i]!;
    });
    current = {
      ...DEFAULT_API_CONFIG,
      apiKey: stored.apiKey ?? DEFAULT_API_CONFIG.apiKey,
      baseURL: stored.baseURL ?? DEFAULT_API_CONFIG.baseURL,
      model: stored.model ?? DEFAULT_API_CONFIG.model,
      providerId: stored.providerId ?? DEFAULT_API_CONFIG.providerId,
      searchProvider: stored.searchProvider ?? DEFAULT_API_CONFIG.searchProvider,
      searchApiKey: stored.searchApiKey ?? DEFAULT_API_CONFIG.searchApiKey,
      searchEndpoint: stored.searchEndpoint ?? DEFAULT_API_CONFIG.searchEndpoint,
      webSearchEnabled: stored.webSearchEnabled === "1",
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
        const raw = current[key];
        const value = typeof raw === "boolean" ? (raw ? "1" : "0") : raw;
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

/** 「智能搜索」是否已具备运行条件（选了引擎且填了所需凭据）。 */
export function isSearchConfigured(): boolean {
  if (current.searchProvider === "none") return false;
  if (current.searchProvider === "searxng") {
    return current.searchEndpoint.trim().length > 0;
  }
  return current.searchApiKey.trim().length > 0;
}
