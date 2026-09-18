import { Icon } from "@/components/icon";
import { cn } from "@/utils/tailwind";
import { Brain, ChevronRight } from "lucide-react-native";
import { useState, useSyncExternalStore } from "react";
import { Pressable, Text, View } from "react-native";
import Animated, { FadeIn, FadeOut } from "react-native-reanimated";
import type { StreamingStore } from "./streaming-store";

const EMPTY_SUBSCRIBE = () => () => {};

/**
 * DeepSeek 风格的思考过程折叠卡片：
 * 流式时显示「正在思考…」并实时展开思考文本；
 * 结束后显示「已思考（用时 X 秒）」，点击展开/收起。
 */
export function ReasoningCard({
  text,
  store,
  streaming,
  duration,
}: {
  text?: string;
  store?: StreamingStore;
  streaming?: boolean;
  duration?: number;
}) {
  const liveText = useSyncExternalStore(
    store ? store.subscribe : EMPTY_SUBSCRIBE,
    () => store?.get() ?? "",
  );
  const [expanded, setExpanded] = useState(false);

  const content = streaming ? liveText : (text ?? "");
  if (!content) return null;

  const label = streaming
    ? "正在思考…"
    : `已思考${duration ? `（用时 ${duration} 秒）` : ""}`;

  return (
    <View className="mb-2">
      <Pressable
        onPress={() => setExpanded((v) => !v)}
        className="flex-row items-center gap-1.5 py-1 self-start active:opacity-60"
      >
        <Icon icon={Brain} className="w-4 h-4 text-muted-foreground" />
        <Text className="text-[14px] text-muted-foreground">{label}</Text>
        <Icon
          icon={ChevronRight}
          className={cn(
            "w-3.5 h-3.5 text-muted-foreground",
            expanded && "rotate-90",
          )}
        />
      </Pressable>
      {expanded && (
        <Animated.View
          entering={FadeIn.duration(180)}
          exiting={FadeOut.duration(120)}
        >
          <Text
            selectable
            className="text-[13px] leading-5 text-muted-foreground"
          >
            {content}
          </Text>
        </Animated.View>
      )}
    </View>
  );
}
