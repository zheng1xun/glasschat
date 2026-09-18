import {
  ChatProvider,
  Conversation,
  ConversationEmptyState,
  ConversationScrollButton,
  Message,
  MessageResponse,
  PromptInput,
  PromptInputAction,
  PromptInputBody,
  PromptInputSubmit,
  PromptInputTextarea,
  StreamingMessage,
  createStreamingStore,
  type ChatMessage,
} from "@/components/chat";
import { ComposerToggles } from "@/components/chat/composer-toggles";
import { ReasoningCard } from "@/components/chat/reasoning-card";
import { Icon } from "@/components/icon";
import { MainHeader } from "@/components/main-header";
import {
  getCurrentSessionId,
  getSessionMessages,
  saveSessionMessages,
  subscribeChatSessions,
  type StoredMessage,
} from "@/lib/chat-sessions";
import { OpenAICompatTransport } from "@/lib/openai-compat-transport";
import { useChat } from "@ai-sdk/react";
import type { UIMessage } from "ai";
import * as Haptics from "expo-haptics";
import { Link } from "expo-router";
import { Plus } from "lucide-react-native";
import { useCallback, useEffect, useMemo, useRef, useState, useSyncExternalStore } from "react";
import { Text, View } from "react-native";

const USE_MOCK = process.env.EXPO_PUBLIC_MOCK_AI === "1";

// Throttle interval for streaming UI updates (~30fps)
const STREAMING_THROTTLE_MS = 32;

const MOCK_RESPONSES = [
  "That's a great question! Here's what I think:\n\nThe key insight is that **simplicity** often beats complexity. When you break down the problem into smaller pieces, the solution becomes much clearer.\n\n```javascript\nconst answer = problems\n  .map(simplify)\n  .reduce(combine, []);\n```\n\nHope that helps!",
  "I'd be happy to help with that. Let me walk you through it step by step:\n\n1. **First**, identify the core requirements\n2. **Then**, design the interface\n3. **Finally**, implement and test\n\nThe most important thing is to start simple and iterate. You can always add more features later.",
  "Interesting! Here's a quick overview:\n\n> The best code is the code you don't have to write.\n\nThat said, when you *do* need to write code, keep these principles in mind:\n\n- **Readability** over cleverness\n- **Composition** over inheritance\n- **Explicit** over implicit\n\nLet me know if you want me to dive deeper into any of these!",
  "Sure thing! Here's a concise answer:\n\nThe approach I'd recommend is to use a **streaming architecture** where data flows through the system in real-time. This gives you:\n\n- Lower latency\n- Better resource utilization\n- Simpler error handling\n\n```python\nasync for chunk in stream:\n    process(chunk)\n```\n\nWant me to elaborate on any part?",
];

async function mockStreamResponse(
  text: string,
  onToken: (token: string) => void,
  signal?: AbortSignal,
) {
  const words = text.split(/(?<=\s)/);
  for (const word of words) {
    if (signal?.aborted) return;
    await new Promise((r) => setTimeout(r, 30 + Math.random() * 40));
    onToken(word);
  }
}

/** Extract text content from a UIMessage's parts array. */
function getTextFromParts(
  parts: Array<{ type: string; text?: string }>,
): string {
  return parts
    .filter((p) => p.type === "text" && p.text)
    .map((p) => p.text)
    .join("");
}

/** Extract reasoning content from a UIMessage's parts array. */
function getReasoningFromParts(
  parts: Array<{ type: string; text?: string }>,
): string {
  return parts
    .filter((p) => p.type === "reasoning" && p.text)
    .map((p) => p.text)
    .join("");
}

function useAIChat(sessionId: string) {
  const [input, setInput] = useState("");
  const streamingStore = useMemo(() => createStreamingStore(), []);
  const reasoningStore = useMemo(() => createStreamingStore(), []);
  const transport = useMemo(() => new OpenAICompatTransport(), []);
  const prevStreamingTextRef = useRef("");
  const prevReasoningTextRef = useRef("");
  // 每条消息的思考开始时间和用时（用于「已思考（用时 X 秒）」）
  const reasoningStartRef = useRef(new Map<string, number>());
  const reasoningDurationRef = useRef(new Map<string, number>());

  // 载入这个会话的历史消息（AI SDK v6 用 messages 字段恢复会话）
  const initialMessages = useMemo(
    () => getSessionMessages(sessionId) as unknown as UIMessage[],
    [sessionId],
  );

  const {
    messages: uiMessages,
    sendMessage,
    status,
    error,
  } = useChat({
    id: sessionId,
    messages: initialMessages,
    transport,
    // 流式期间 10fps 刷新，排版重算的开销可控
    experimental_throttle: 100,
  });

  const isStreaming = status === "streaming";

  // 流式开始/结束时把消息持久化到会话存储
  const prevStatusRef = useRef(status);
  useEffect(() => {
    const prev = prevStatusRef.current;
    prevStatusRef.current = status;
    if (
      prev !== status &&
      (status === "streaming" || prev === "streaming")
    ) {
      saveSessionMessages(
        sessionId,
        uiMessages as unknown as StoredMessage[],
      );
    }
  }, [status, uiMessages, sessionId]);

  // Map UIMessages to ChatMessages
  const messages: ChatMessage[] = useMemo(() => {
    return uiMessages.map((m) => {
      const parts = m.parts as Array<{ type: string; text?: string }>;
      const reasoning = getReasoningFromParts(parts);
      return {
        id: m.id,
        role: m.role as "user" | "assistant",
        content:
          isStreaming &&
          m.role === "assistant" &&
          m === uiMessages[uiMessages.length - 1]
            ? "" // Signal streaming — content comes from store
            : getTextFromParts(parts),
        reasoning: reasoning || undefined,
        reasoningDuration: reasoningDurationRef.current.get(m.id),
      };
    });
  }, [uiMessages, isStreaming]);

  // Sync streaming text + reasoning to the stores
  useEffect(() => {
    if (!isStreaming) {
      if (prevStreamingTextRef.current) {
        prevStreamingTextRef.current = "";
        streamingStore.set("");
      }
      if (prevReasoningTextRef.current) {
        prevReasoningTextRef.current = "";
        reasoningStore.set("");
      }
      // 流结束：补上思考用时
      const lastMessage = uiMessages[uiMessages.length - 1];
      if (lastMessage) {
        const start = reasoningStartRef.current.get(lastMessage.id);
        if (start != null && !reasoningDurationRef.current.has(lastMessage.id)) {
          reasoningDurationRef.current.set(
            lastMessage.id,
            Math.max(1, Math.round((Date.now() - start) / 1000)),
          );
        }
      }
      return;
    }
    const lastMessage = uiMessages[uiMessages.length - 1];
    if (lastMessage?.role === "assistant") {
      const parts = lastMessage.parts as Array<{ type: string; text?: string }>;
      const text = getTextFromParts(parts);
      if (text !== prevStreamingTextRef.current) {
        prevStreamingTextRef.current = text;
        streamingStore.set(text);
      }
      const reasoning = getReasoningFromParts(parts);
      if (reasoning && !reasoningStartRef.current.has(lastMessage.id)) {
        reasoningStartRef.current.set(lastMessage.id, Date.now());
      }
      // 思考结束（正文开始出现）时记录用时
      if (reasoning && text && !reasoningDurationRef.current.has(lastMessage.id)) {
        const start = reasoningStartRef.current.get(lastMessage.id);
        if (start != null) {
          reasoningDurationRef.current.set(
            lastMessage.id,
            Math.max(1, Math.round((Date.now() - start) / 1000)),
          );
        }
      }
      if (reasoning !== prevReasoningTextRef.current) {
        prevReasoningTextRef.current = reasoning;
        reasoningStore.set(reasoning);
      }
    }
  }, [uiMessages, isStreaming, streamingStore, reasoningStore]);

  const onSend = useCallback(() => {
    if (!input.trim() || isStreaming) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    sendMessage({ text: input });
    setInput("");
  }, [input, isStreaming, sendMessage]);

  return {
    messages,
    input,
    setInput,
    isGenerating: isStreaming,
    onSend,
    streamingStore,
    reasoningStore,
    error: error ?? null,
  };
}

function useMockChat() {
  const [input, setInput] = useState("");
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [isGenerating, setIsGenerating] = useState(false);
  const streamingStore = useMemo(() => createStreamingStore(), []);
  const reasoningStore = useMemo(() => createStreamingStore(), []);
  const streamingRef = useRef("");
  const throttleRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const mockIndexRef = useRef(0);

  const handleSend = useCallback(async () => {
    if (!input.trim() || isGenerating) return;

    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);

    const userMessage: ChatMessage = {
      id: Date.now().toString(),
      role: "user",
      content: input.trim(),
    };

    const assistantMessage: ChatMessage = {
      id: (Date.now() + 1).toString(),
      role: "assistant",
      content: "",
    };

    const newMessages = [...messages, userMessage, assistantMessage];
    setMessages(newMessages);
    setInput("");
    setIsGenerating(true);

    streamingRef.current = "";
    streamingStore.set("");

    try {
      const mockText =
        MOCK_RESPONSES[mockIndexRef.current % MOCK_RESPONSES.length];
      mockIndexRef.current++;

      await mockStreamResponse(mockText, (token) => {
        streamingRef.current += token;
        if (!throttleRef.current) {
          throttleRef.current = setTimeout(() => {
            streamingStore.set(streamingRef.current);
            throttleRef.current = null;
          }, STREAMING_THROTTLE_MS);
        }
      });
    } catch (err) {
      console.error("Generation error:", err);
      streamingRef.current = "Error generating response";
    } finally {
      if (throttleRef.current) {
        clearTimeout(throttleRef.current);
        throttleRef.current = null;
      }
      const finalContent = streamingRef.current;
      setMessages((prev) => {
        const updated = [...prev];
        const lastIdx = updated.length - 1;
        updated[lastIdx] = {
          ...updated[lastIdx],
          content: finalContent,
        };
        return updated;
      });
      streamingRef.current = "";
      streamingStore.set("");
      setIsGenerating(false);

      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    }
  }, [input, isGenerating, messages, streamingStore]);

  return {
    messages,
    input,
    setInput,
    isGenerating,
    onSend: handleSend,
    streamingStore,
    reasoningStore,
    error: null,
  };
}

export default function ChatScreen() {
  const currentId = useSyncExternalStore(
    subscribeChatSessions,
    getCurrentSessionId,
  );

  if (!currentId) {
    // 会话存储水合完成前的空白帧
    return <View className="flex-1 bg-background" />;
  }
  // key 保证切换会话时 useChat 整体重挂载，互不串台
  return <ChatScreenInner key={currentId} sessionId={currentId} />;
}

function ChatScreenInner({ sessionId }: { sessionId: string }) {
  const chat = USE_MOCK ? useMockChat() : useAIChat(sessionId);
  const { messages, isGenerating, streamingStore, reasoningStore } = chat;

  const renderMessage = useCallback(
    ({ item }: { item: ChatMessage }) => {
      if (item.role === "user") {
        return <Message from="user">{item.content}</Message>;
      }

      const isStreaming = isGenerating && item.content === "";
      return (
        <Message from="assistant">
          <ReasoningCard
            streaming={isStreaming}
            text={item.reasoning}
            store={reasoningStore}
            duration={item.reasoningDuration}
          />
          {isStreaming ? (
            <StreamingMessage store={streamingStore} />
          ) : (
            <MessageResponse>{item.content}</MessageResponse>
          )}
        </Message>
      );
    },
    [isGenerating, streamingStore, reasoningStore],
  );

  return (
    <>
      <ChatProvider value={chat}>
        <Conversation
          renderMessage={renderMessage}
          emptyState={
            <ConversationEmptyState
              title="琉璃"
              description="发一条消息，开始对话"
            />
          }
        >
          <ConversationScrollButton />
          {chat.error && (
            <View className="mx-4 mb-2 px-4 py-3 rounded-2xl bg-red-500/10 border border-red-500/30">
              <Text className="text-red-500 text-[13px] leading-5">
                {chat.error.message || String(chat.error)}
              </Text>
            </View>
          )}
          <PromptInput header={<ComposerToggles />}>
            <Link href="/attachments" asChild>
              <PromptInputAction>
                <Icon icon={Plus} className="w-5 h-5 text-muted-foreground" />
              </PromptInputAction>
            </Link>
            <PromptInputBody>
              <PromptInputTextarea />
              <PromptInputSubmit />
            </PromptInputBody>
          </PromptInput>
        </Conversation>
      </ChatProvider>
      <MainHeader />
    </>
  );
}
