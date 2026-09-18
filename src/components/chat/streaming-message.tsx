import { ChatMarkdown } from "@/components/markdown";
import { useSyncExternalStore } from "react";
import { Text } from "react-native";
import type { StreamingStore } from "./streaming-store";

/**
 * 流式输出时 markdown 可能不完整（比如代码块只写了一半），
 * 自动补上未闭合的代码围栏，让流式期间也能正常排版。
 */
function closeOpenFences(md: string): string {
  const fences = md.match(/```/g);
  if (fences && fences.length % 2 === 1) {
    return md + "\n```";
  }
  return md;
}

/** 流式消息：边接收边做 Markdown 排版（DeepSeek 同款体验），末尾带光标。 */
export function StreamingMessage({ store }: { store: StreamingStore }) {
  const text = useSyncExternalStore(store.subscribe, store.get);

  if (!text) {
    return (
      <Text className="text-base leading-[26px] text-muted-foreground">
        …
      </Text>
    );
  }

  return (
    <ChatMarkdown>{closeOpenFences(text) + " ▍"}</ChatMarkdown>
  );
}
