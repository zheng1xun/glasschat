import { Icon } from "@/components/icon";
import {
  DEFAULT_API_CONFIG,
  MODEL_PRESETS,
  getApiConfig,
  isApiConfigured,
  setApiConfig,
  subscribeApiConfig,
  type ApiConfig,
} from "@/lib/api-config";
import * as Linking from "expo-linking";
import {
  Check,
  CircleAlert,
  CircleCheck,
  KeyRound,
  Link2,
  Sparkles,
} from "lucide-react-native";
import { useEffect, useState, useSyncExternalStore } from "react";
import { Pressable, ScrollView, Text, TextInput, View } from "react-native";

export default function SettingsScreen() {
  const config = useSyncExternalStore(subscribeApiConfig, getApiConfig);
  const configured = isApiConfigured();

  return (
    <ScrollView
      className="flex-1 bg-background text-foreground"
      contentInsetAdjustmentBehavior="automatic"
      contentContainerClassName="android:pb-safe"
    >
      {/* 连接状态 */}
      <View className="mx-5 mt-4 mb-5 bg-muted rounded-2xl px-4 py-3 border-continuous flex-row items-center gap-3">
        <Icon
          icon={configured ? CircleCheck : CircleAlert}
          className={configured ? "w-5 h-5 text-green-500" : "w-5 h-5 text-orange-500"}
        />
        <Text className="text-[15px] text-foreground flex-1">
          {configured ? `已配置 · ${config.model}` : "未配置 API Key，先填下面的接口信息"}
        </Text>
      </View>

      {/* 接口配置 */}
      <SectionHeader label="接口配置" />
      <Card>
        <ConfigField
          icon={KeyRound}
          label="API Key"
          placeholder="sk-..."
          configKey="apiKey"
          secure
        />
        <RowDivider />
        <ConfigField
          icon={Link2}
          label="API 地址"
          placeholder={DEFAULT_API_CONFIG.baseURL}
          configKey="baseURL"
          keyboardType="url"
        />
      </Card>
      <View className="px-5 pb-2 pt-2">
        <Text className="text-[13px] text-muted-foreground leading-5">
          默认是 DeepSeek，也可以填任何 OpenAI 兼容接口（地址到 /v1 这一级）。
          Key 只保存在本机钥匙串，不上传到任何地方。
        </Text>
        <Pressable
          className="mt-2 active:opacity-60"
          onPress={() => Linking.openURL("https://platform.deepseek.com/api_keys")}
        >
          <Text className="text-[15px] text-brand">获取 DeepSeek API Key →</Text>
        </Pressable>
      </View>

      {/* 模型 */}
      <SectionHeader label="模型" />
      <Card>
        {MODEL_PRESETS.map((preset, i) => (
          <View key={preset.id}>
            {i > 0 && <RowDivider />}
            <Pressable
              className="flex-row items-center px-4 py-3.5 gap-3 active:bg-muted"
              onPress={() => setApiConfig({ model: preset.id })}
            >
              <Icon icon={Sparkles} className="w-5 h-5 text-foreground" />
              <View className="flex-1">
                <Text className="text-[16px] text-foreground">{preset.label}</Text>
                <Text className="text-[12px] text-muted-foreground">
                  {preset.subtitle}
                </Text>
              </View>
              {config.model === preset.id && (
                <Icon icon={Check} className="w-5 h-5 text-brand" />
              )}
            </Pressable>
          </View>
        ))}
        <RowDivider />
        <CustomModelField currentModel={config.model} />
      </Card>

      {/* 关于 */}
      <SectionHeader label="关于" />
      <Card>
        <View className="px-4 py-3.5">
          <Text className="text-[13px] text-muted-foreground leading-5">
            琉璃 GlassChat · 基于 Expo chat-template 改造 · iOS 26 液态玻璃
          </Text>
        </View>
      </Card>
    </ScrollView>
  );
}

function SectionHeader({ label }: { label: string }) {
  return (
    <Text className="px-6 pt-5 pb-2 text-[13px] text-muted-foreground">
      {label}
    </Text>
  );
}

function Card({ children }: { children: React.ReactNode }) {
  return (
    <View className="mx-5 rounded-2xl bg-card border-continuous overflow-hidden">
      {children}
    </View>
  );
}

function RowDivider() {
  return <View className="h-px bg-border ml-14" />;
}

function ConfigField({
  icon,
  label,
  placeholder,
  configKey,
  secure,
  keyboardType,
}: {
  icon: typeof KeyRound;
  label: string;
  placeholder: string;
  configKey: keyof ApiConfig;
  secure?: boolean;
  keyboardType?: "default" | "url";
}) {
  const config = useSyncExternalStore(subscribeApiConfig, getApiConfig);
  const [draft, setDraft] = useState(config[configKey]);

  // 外部（如首次水合完成）更新时同步到输入框
  useEffect(() => {
    setDraft(config[configKey]);
  }, [config, configKey]);

  return (
    <View className="flex-row items-center px-4 py-3 gap-3">
      <Icon icon={icon} className="w-5 h-5 text-foreground" />
      <View className="flex-1">
        <Text className="text-[12px] text-muted-foreground">{label}</Text>
        <TextInput
          className="text-[16px] text-foreground py-1"
          value={draft}
          onChangeText={setDraft}
          onBlur={() => setApiConfig({ [configKey]: draft.trim() })}
          placeholder={placeholder}
          placeholderTextColor="#888"
          secureTextEntry={secure}
          autoCapitalize="none"
          autoCorrect={false}
          keyboardType={keyboardType}
        />
      </View>
    </View>
  );
}

function CustomModelField({ currentModel }: { currentModel: string }) {
  const isPreset = MODEL_PRESETS.some((p) => p.id === currentModel);
  const [draft, setDraft] = useState(isPreset ? "" : currentModel);

  return (
    <View className="px-4 py-3">
      <Text className="text-[12px] text-muted-foreground">自定义模型名</Text>
      <TextInput
        className="text-[16px] text-foreground py-1"
        value={draft}
        onChangeText={setDraft}
        onBlur={() => {
          const value = draft.trim();
          if (value) setApiConfig({ model: value });
        }}
        placeholder="例如 gpt-4o-mini"
        placeholderTextColor="#888"
        autoCapitalize="none"
        autoCorrect={false}
      />
    </View>
  );
}
