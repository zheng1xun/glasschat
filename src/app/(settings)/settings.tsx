import { Icon } from "@/components/icon";
import {
  DEFAULT_API_CONFIG,
  PROVIDER_PRESETS,
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
  Globe,
  KeyRound,
  Link2,
  Sparkles,
} from "lucide-react-native";
import { useEffect, useState, useSyncExternalStore } from "react";
import { Pressable, ScrollView, Text, TextInput, View } from "react-native";

const SEARCH_PROVIDERS = [
  { id: "none", label: "不使用", hint: "" },
  { id: "tavily", label: "Tavily", hint: "推荐，免费额度足够自用" },
  { id: "bocha", label: "博查", hint: "国内可直连" },
  { id: "searxng", label: "SearXNG", hint: "自建实例，填地址即可" },
  { id: "bing", label: "Bing", hint: "需要 Azure 订阅 Key" },
] as const;

export default function SettingsScreen() {
  const config = useSyncExternalStore(subscribeApiConfig, getApiConfig);
  const configured = isApiConfigured();

  const provider =
    PROVIDER_PRESETS.find((p) => p.id === config.providerId) ??
    PROVIDER_PRESETS[0];
  const modelPresets = provider.models;

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
          {configured
            ? `已配置 · ${provider.label} · ${config.model}`
            : "未配置 API Key，先填下面的接口信息"}
        </Text>
      </View>

      {/* 服务商 */}
      <SectionHeader label="服务商" />
      <Card>
        <View className="flex-row flex-wrap gap-2 px-4 py-3.5">
          {PROVIDER_PRESETS.map((preset) => {
            const active = config.providerId === preset.id;
            return (
              <Pressable
                key={preset.id}
                onPress={() =>
                  setApiConfig(
                    preset.baseURL
                      ? { providerId: preset.id, baseURL: preset.baseURL }
                      : { providerId: preset.id },
                  )
                }
                className="rounded-full px-3.5 py-2 border-continuous active:opacity-70"
                style={
                  active
                    ? {
                        backgroundColor: "rgba(75,123,255,0.12)",
                        borderColor: "#4B7BFF",
                      }
                    : undefined
                }
              >
                <Text
                  className={
                    active
                      ? "text-[14px] text-brand"
                      : "text-[14px] text-foreground"
                  }
                >
                  {preset.label}
                </Text>
              </Pressable>
            );
          })}
        </View>
      </Card>

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
      <View className="px-6 pb-2 pt-2">
        <Text className="text-[13px] text-muted-foreground leading-5">
          以上服务商都兼容 OpenAI 协议，选预设会自动填好地址，贴入 Key
          即可；自定义服务商选「自定义」再手动改地址。Key 只保存在本机钥匙串。
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
        {modelPresets.map((modelId, i) => (
          <View key={modelId}>
            {i > 0 && <RowDivider />}
            <Pressable
              className="flex-row items-center px-4 py-3.5 gap-3 active:bg-muted"
              onPress={() => setApiConfig({ model: modelId })}
            >
              <Icon icon={Sparkles} className="w-5 h-5 text-foreground" />
              <Text className="flex-1 text-[16px] text-foreground">
                {modelId}
              </Text>
              {config.model === modelId && (
                <Icon icon={Check} className="w-5 h-5 text-brand" />
              )}
            </Pressable>
          </View>
        ))}
        {modelPresets.length > 0 && <RowDivider />}
        <CustomModelField currentModel={config.model} />
      </Card>

      {/* 联网搜索 */}
      <SectionHeader label="联网搜索" />
      <Card>
        <View className="flex-row flex-wrap gap-2 px-4 py-3.5">
          {SEARCH_PROVIDERS.map((item) => {
            const active = config.searchProvider === item.id;
            return (
              <Pressable
                key={item.id}
                onPress={() =>
                  setApiConfig({
                    searchProvider: item.id,
                    webSearchEnabled:
                      item.id === "none" ? false : config.webSearchEnabled,
                  })
                }
                className="rounded-full px-3.5 py-2 border-continuous active:opacity-70"
                style={
                  active
                    ? {
                        backgroundColor: "rgba(75,123,255,0.12)",
                        borderColor: "#4B7BFF",
                      }
                    : undefined
                }
              >
                <Text
                  className={
                    active
                      ? "text-[14px] text-brand"
                      : "text-[14px] text-foreground"
                  }
                >
                  {item.label}
                </Text>
              </Pressable>
            );
          })}
        </View>
        {config.searchProvider !== "none" && (
          <>
            <RowDivider />
            {config.searchProvider === "searxng" ? (
              <ConfigField
                icon={Link2}
                label="SearXNG 实例地址"
                placeholder="https://searx.example.com"
                configKey="searchEndpoint"
                keyboardType="url"
              />
            ) : (
              <ConfigField
                icon={KeyRound}
                label="搜索引擎 API Key"
                placeholder="tvly-..."
                configKey="searchApiKey"
                secure
              />
            )}
          </>
        )}
      </Card>
      <View className="px-6 pb-2 pt-2">
        <Text className="text-[13px] text-muted-foreground leading-5">
          配置后到输入框上方打开「智能搜索」，发问前会先联网检索，回答自动带
          [1][2] 来源角标。Tavily 申请：tavily.com（每月 1000 次免费）。
        </Text>
      </View>

      {/* 关于 */}
      <SectionHeader label="关于" />
      <Card>
        <View className="px-4 py-3.5 flex-row items-center gap-3">
          <Icon icon={Globe} className="w-5 h-5 text-muted-foreground" />
          <Text className="text-[13px] text-muted-foreground leading-5 flex-1">
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
  const [draft, setDraft] = useState(String(config[configKey] ?? ""));

  // 外部（如首次水合完成）更新时同步到输入框
  useEffect(() => {
    setDraft(String(config[configKey] ?? ""));
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
          onBlur={() =>
            setApiConfig({ [configKey]: draft.trim() } as Partial<ApiConfig>)
          }
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
  const isPreset = PROVIDER_PRESETS.some((p) =>
    (p.models as readonly string[]).includes(currentModel),
  );
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
