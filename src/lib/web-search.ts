import type { ApiConfig } from "./api-config";

export type SearchResult = {
  title: string;
  url: string;
  snippet: string;
};

const TIMEOUT_MS = 8000;

/**
 * 联网搜索（Cherry Studio 同款思路：搜索 API → 结果注入上下文）。
 * 支持 Tavily / 博查 / SearXNG / Bing。任何失败都返回空数组，不影响正常对话。
 */
export async function searchWeb(
  query: string,
  config: ApiConfig,
  signal?: AbortSignal,
): Promise<SearchResult[]> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);
  if (signal) {
    if (signal.aborted) controller.abort();
    else {
      signal.addEventListener("abort", () => controller.abort(), {
        once: true,
      });
    }
  }
  const effectiveSignal = controller.signal;

  try {
    switch (config.searchProvider) {
      case "tavily":
        return await tavily(query, config.searchApiKey, effectiveSignal);
      case "bocha":
        return await bocha(query, config.searchApiKey, effectiveSignal);
      case "bing":
        return await bing(query, config.searchApiKey, effectiveSignal);
      case "searxng":
        return await searxng(query, config.searchEndpoint, effectiveSignal);
      default:
        return [];
    }
  } catch (error) {
    console.warn("[web-search] 搜索失败，继续无搜索对话:", error);
    return [];
  } finally {
    clearTimeout(timer);
  }
}

async function tavily(
  query: string,
  apiKey: string,
  signal?: AbortSignal,
): Promise<SearchResult[]> {
  const res = await fetch("https://api.tavily.com/search", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ api_key: apiKey, query, max_results: 5 }),
    signal: signal ?? null,
  });
  if (!res.ok) return [];
  const json = await res.json();
  return (json.results ?? []).map((r: any) => ({
    title: r.title ?? "",
    url: r.url ?? "",
    snippet: r.content ?? "",
  }));
}

async function bocha(
  query: string,
  apiKey: string,
  signal?: AbortSignal,
): Promise<SearchResult[]> {
  const res = await fetch("https://api.bochaai.com/v1/web-search", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({ query, count: 5, summary: true }),
    signal: signal ?? null,
  });
  if (!res.ok) return [];
  const json = await res.json();
  return (json.data?.webPages?.value ?? []).map((r: any) => ({
    title: r.name ?? "",
    url: r.url ?? "",
    snippet: r.snippet ?? "",
  }));
}

async function bing(
  query: string,
  apiKey: string,
  signal?: AbortSignal,
): Promise<SearchResult[]> {
  const res = await fetch(
    `https://api.bing.microsoft.com/v7.0/search?q=${encodeURIComponent(query)}&count=5&textDecorations=false`,
    {
      headers: { "Ocp-Apim-Subscription-Key": apiKey },
      signal: signal ?? null,
    },
  );
  if (!res.ok) return [];
  const json = await res.json();
  return (json.webPages?.value ?? []).map((r: any) => ({
    title: r.name ?? "",
    url: r.url ?? "",
    snippet: r.snippet ?? "",
  }));
}

async function searxng(
  query: string,
  endpoint: string,
  signal?: AbortSignal,
): Promise<SearchResult[]> {
  const base = endpoint.trim().replace(/\/+$/, "");
  const res = await fetch(
    `${base}/search?q=${encodeURIComponent(query)}&format=json`,
    { signal: signal ?? null },
  );
  if (!res.ok) return [];
  const json = await res.json();
  return (json.results ?? []).slice(0, 5).map((r: any) => ({
    title: r.title ?? "",
    url: r.url ?? "",
    snippet: r.content ?? "",
  }));
}
