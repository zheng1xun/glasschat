import { Icon } from "@/components/icon";
import {
  getApiConfig,
  isSearchConfigured,
  setApiConfig,
  subscribeApiConfig,
} from "@/lib/api-config";
import type { LucideIcon } from "lucide-react-native";
import { Brain, Globe } from "lucide-react-native";
import { useSyncExternalStore } from "react";
import { Alert, Pressable, Text, View } from "react-native";
import { useRouter } from "expo-router";

/**
 * 输入框上方的快捷开关（DeepSeek 风格胶囊按钮）。
 * 「深度思考」：DeepSeek 下切换 chat / reasoner 模型，真实生效；
 * 「智能搜索」：开启后发问前先调搜索引擎 API（Tavily/博查/SearXNG/Bing，
 * 在设置页配置），结果注入上下文并自动生成 [1][2] 引用角标。
 */
export function ComposerToggles() {
  const config = useSyncExternalStore(subscribeApiConfig, getApiConfig);
  const router = useRouter();
  const reasoningOn = config.model === "deepseek-reasoner";
  const searchOn = config.webSearchEnabled && isSearchConfigured();
  const isDeepSeek = config.providerId === "deepseek";

  return (
    <View className="flex-row gap-2 px-1 pb-2">
      {isDeepSeek && (
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
      )}
      <TogglePill
        icon={Globe}
        label="智能搜索"
        active={searchOn}
        onPress={() => {
          if (searchOn) {
            setApiConfig({ webSearchEnabled: false });
            return;
          }
          if (config.searchProvider === "none") {
            Alert.alert(
              "先配置搜索引擎",
              "到 设置 → 联网搜索 里选一个搜索引擎并填入 Key（推荐 Tavily，免费额度足够自用）。",
              [
                { text: "取消", style: "cancel" },
                {
                  text: "去设置",
                  onPress: () => router.navigate("/(settings)/settings"),
                },
              ],
            );
            return;
          }
          if (!isSearchConfigured()) {
            Alert.alert(
              "搜索引擎缺少凭据",
              "到 设置 → 联网搜索 里补上 API Key 或实例地址。",
            );
            return;
          }
          setApiConfig({ webSearchEnabled: true });
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
