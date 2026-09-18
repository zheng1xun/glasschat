import { Icon } from "@/components/icon";
import {
  getApiConfig,
  setApiConfig,
  subscribeApiConfig,
} from "@/lib/api-config";
import type { LucideIcon } from "lucide-react-native";
import { Brain, Globe } from "lucide-react-native";
import { useSyncExternalStore } from "react";
import { Alert, Pressable, Text, View } from "react-native";

/**
 * 输入框上方的快捷开关（DeepSeek 风格胶囊按钮）。
 * 「深度思考」真实生效：在 deepseek-chat / deepseek-reasoner 之间切换模型；
 * 「智能搜索」DeepSeek 官方 API 暂未开放，先预留位置。
 */
export function ComposerToggles() {
  const config = useSyncExternalStore(subscribeApiConfig, getApiConfig);
  const reasoningOn = config.model === "deepseek-reasoner";

  return (
    <View className="flex-row gap-2 px-1 pb-2">
      <TogglePill
        icon={Brain}
        label="深度思考"
        active={reasoningOn}
        onPress={() => {
          setApiConfig({
            model: reasoningOn ? "deepseek-chat" : "deepseek-reasoner",
          });
        }}
      />
      <TogglePill
        icon={Globe}
        label="智能搜索"
        active={false}
        onPress={() => {
          Alert.alert(
            "暂不支持",
            "DeepSeek 官方 API 暂未开放联网搜索能力，这里先为你预留了位置；以后接入支持搜索的接口即可生效。",
          );
        }}
      />
    </View>
  );
}

function TogglePill({
  icon,
  label,
  active,
  onPress,
}: {
  icon: LucideIcon;
  label: string;
  active: boolean;
  onPress: () => void;
}) {
  return (
    <Pressable
      onPress={onPress}
      className="flex-row items-center gap-1.5 rounded-full px-3 py-1.5 border-continuous active:opacity-70"
      style={
        active
          ? { backgroundColor: "rgba(75,123,255,0.12)", borderColor: "#4B7BFF" }
          : undefined
      }
    >
      <Icon
        icon={icon}
        className={
          active ? "w-4 h-4 text-brand" : "w-4 h-4 text-muted-foreground"
        }
      />
      <Text
        className={
          active ? "text-[13px] text-brand" : "text-[13px] text-muted-foreground"
        }
      >
        {label}
      </Text>
    </Pressable>
  );
}
