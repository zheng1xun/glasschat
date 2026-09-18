import type {
  ChatRequestOptions,
  ChatTransport,
  UIMessage,
  UIMessageChunk,
} from "ai";
import { fetch as expoFetch } from "expo/fetch";

import { getApiConfig } from "./api-config";

type SendMessagesOptions = {
  trigger: "submit-message" | "regenerate-message";
  chatId: string;
  messageId: string | undefined;
  messages: UIMessage[];
  abortSignal: AbortSignal | undefined;
} & ChatRequestOptions;

/**
 * 直连任意 OpenAI 兼容接口（默认 DeepSeek）的 ChatTransport。
 * 用 expo/fetch 拿流式响应，手动解析 SSE，转成 AI SDK 的 UIMessageChunk 流。
 * 不需要任何服务端，侧载包也能直接用。
 */
export class OpenAICompatTransport implements ChatTransport<UIMessage> {
  async sendMessages(
    options: SendMessagesOptions,
  ): Promise<ReadableStream<UIMessageChunk>> {
    const config = getApiConfig();
    if (!config.apiKey.trim()) {
      throw new Error("还没有配置 API Key：打开右上角设置，填入 DeepSeek API Key。");
    }

    const url =
      config.baseURL.trim().replace(/\/+$/, "") + "/chat/completions";

    const response = await expoFetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${config.apiKey.trim()}`,
      },
      body: JSON.stringify({
        model: config.model,
        stream: true,
        messages: toOpenAIMessages(options.messages),
      }),
      signal: options.abortSignal ?? null,
    });

    if (!response.ok || !response.body) {
      const detail = await response.text().catch(() => "");
      throw new Error(
        `请求失败 HTTP ${response.status}${detail ? `：${detail.slice(0, 200)}` : ""}`,
      );
    }

    return sseToUIMessageStream(response.body);
  }

  async reconnectToStream(): Promise<ReadableStream<UIMessageChunk> | null> {
    // 移动端自用不需要断线重连
    return null;
  }
}

function toOpenAIMessages(messages: UIMessage[]) {
  return messages
    .map((message) => ({
      role: message.role,
      content: message.parts
        .filter((part) => part.type === "text")
        .map((part) => (part as { type: "text"; text: string }).text)
        .join(""),
    }))
    .filter((message) => message.content.trim().length > 0);
}

/** 把 SSE 字节流解析成 UIMessageChunk 流（支持 reasoning_content 思考过程）。 */
function sseToUIMessageStream(
  body: ReadableStream<Uint8Array>,
): ReadableStream<UIMessageChunk> {
  const reader = body.getReader();
  const decoder = new TextDecoder();

  let buffer = "";
  let started = false;
  let textId: string | null = null;
  let reasoningId: string | null = null;

  function closeOpenBlocks(
    controller: ReadableStreamDefaultController<UIMessageChunk>,
  ) {
    if (reasoningId) {
      controller.enqueue({ type: "reasoning-end", id: reasoningId });
      reasoningId = null;
    }
    if (textId) {
      controller.enqueue({ type: "text-end", id: textId });
      textId = null;
    }
  }

  function handleLine(
    rawLine: string,
    controller: ReadableStreamDefaultController<UIMessageChunk>,
  ) {
    const line = rawLine.trimEnd();
    if (!line.startsWith("data:")) return;
    const payload = line.slice(5).trim();
    if (!payload || payload === "[DONE]") return;

    let json: any;
    try {
      json = JSON.parse(payload);
    } catch {
      return;
    }

    if (!started) {
      started = true;
      controller.enqueue({ type: "start" });
      controller.enqueue({ type: "start-step" });
    }

    const delta = json?.choices?.[0]?.delta;
    if (!delta) return;

    const reasoning = delta.reasoning_content ?? delta.reasoning;
    if (typeof reasoning === "string" && reasoning.length > 0) {
      if (!reasoningId) {
        reasoningId = "reasoning";
        controller.enqueue({ type: "reasoning-start", id: reasoningId });
      }
      controller.enqueue({ type: "reasoning-delta", id: reasoningId, delta: reasoning });
    }

    const content = delta.content;
    if (typeof content === "string" && content.length > 0) {
      if (reasoningId) {
        controller.enqueue({ type: "reasoning-end", id: reasoningId });
        reasoningId = null;
      }
      if (!textId) {
        textId = "text";
        controller.enqueue({ type: "text-start", id: textId });
      }
      controller.enqueue({ type: "text-delta", id: textId, delta: content });
    }
  }

  return new ReadableStream<UIMessageChunk>({
    async pull(controller) {
      try {
        const { done, value } = await reader.read();
        if (done) {
          if (buffer.trim()) handleLine(buffer, controller);
          closeOpenBlocks(controller);
          if (started) {
            controller.enqueue({ type: "finish-step" });
            controller.enqueue({ type: "finish" });
          }
          controller.close();
          return;
        }
        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split(/\r?\n/);
        buffer = lines.pop() ?? "";
        for (const line of lines) {
          handleLine(line, controller);
        }
      } catch (error) {
        closeOpenBlocks(controller);
        controller.enqueue({
          type: "error",
          errorText: error instanceof Error ? error.message : String(error),
        });
        controller.close();
      }
    },
    async cancel() {
      try {
        await reader.cancel();
      } catch {
        // 已经是取消流程，忽略
      }
    },
  });
}
