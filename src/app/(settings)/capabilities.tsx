import { Icon } from "@/components/icon";
import {
  Box,
  Brain,
  Check,
  ChevronRight,
  FileCog,
  Globe,
  Search,
} from "lucide-react-native";
import type { LucideIcon } from "lucide-react-native";
import { useState } from "react";
import { ScrollView, Switch, Text, View } from "react-native";

export default function CapabilitiesScreen() {
  const [artifacts, setArtifacts] = useState(true);
  const [codeExecution, setCodeExecution] = useState(true);
  const [webSearch, setWebSearch] = useState(true);
  const [searchChats, setSearchChats] = useState(true);
  const [generateMemory, setGenerateMemory] = useState(true);

  return (
    <ScrollView
      className="flex-1 bg-background text-foreground"
      contentInsetAdjustmentBehavior="automatic"
      contentContainerClassName="pb-10"
    >
      <CapabilityToggle
        icon={Box}
        label="Artifacts"
        description="代码运行的前置依赖"
        value={artifacts}
        onValueChange={setArtifacts}
      />
      <CapabilityToggle
        icon={FileCog}
        label="代码运行与文件创建"
        description="允许 AI 运行代码，创建和编辑文档、表格、演示文稿、PDF 和数据报告。"
        value={codeExecution}
        onValueChange={setCodeExecution}
      />
      <CapabilityToggle
        icon={Globe}
        label="联网搜索"
        description="当 AI 判断需要最新信息时，会自动搜索网络"
        value={webSearch}
        onValueChange={setWebSearch}
      />

      <View className="h-px bg-border mx-5 mt-2" />

      <SectionHeader title="记忆" />

      <CapabilityToggle
        icon={Search}
        label="搜索并引用历史对话"
        description="允许 AI 搜索历史对话中的相关细节。"
        value={searchChats}
        onValueChange={setSearchChats}
      />
      <CapabilityToggle
        icon={Brain}
        label="从对话历史生成记忆"
        description="允许 AI 记住对话中的相关上下文。此设置同时作用于对话和项目。"
        value={generateMemory}
        onValueChange={setGenerateMemory}
      />

      {/* View your memory card */}
      <View
        className="mx-5 mt-4 bg-muted rounded-xl px-4 py-3.5 flex-row items-center border-continuous"
      >
        <View className="flex-1">
          <Text className="text-[15px] font-medium text-foreground">
            查看你的记忆
          </Text>
          <Text className="text-[13px] text-muted-foreground mt-0.5">
            4 天前根据你的对话更新
          </Text>
        </View>
        <Icon
          icon={ChevronRight}
          className="w-3.5 h-3.5 text-muted-foreground"
        />
      </View>

      <View className="h-px bg-border mx-5 mt-6" />

      <SectionHeader title="工具调用" />

      <ToolAccessOption
        label="自动"
        description="由 AI 为你选择"
        selected
      />
      <ToolAccessOption
        label="按需加载"
        description="需要时再加载。消息更多，精度略低"
      />
      <ToolAccessOption label="始终可用" />
    </ScrollView>
  );
}

function ToolAccessOption({
  label,
  description,
  selected,
}: {
  label: string;
  description?: string;
  selected?: boolean;
}) {
  return (
    <View className="flex-row items-center px-5 py-3 gap-4">
      <View className="flex-1">
        <Text className="text-[17px] text-foreground">{label}</Text>
        {description && (
          <Text className="text-[13px] text-muted-foreground">
            {description}
          </Text>
        )}
      </View>
      {selected && (
        <Icon icon={Check} className="w-5 h-5 text-blue-500" />
      )}
    </View>
  );
}

function CapabilityToggle({
  icon,
  label,
  description,
  value,
  onValueChange,
}: {
  icon: LucideIcon;
  label: string;
  description?: string;
  value: boolean;
  onValueChange: (v: boolean) => void;
}) {
  return (
    <View className="flex-row items-center px-5 py-3.5 gap-4">
      <Icon icon={icon} className="w-5 h-5 text-foreground" />
      <View className="flex-1 gap-0.5">
        <Text className="text-[17px] text-foreground">{label}</Text>
        {description && (
          <Text className="text-[13px] text-muted-foreground leading-snug">
            {description}
          </Text>
        )}
      </View>
      <Switch value={value} onValueChange={onValueChange} />
    </View>
  );
}

function SectionHeader({ title }: { title: string }) {
  return (
    <Text className="text-[15px] font-semibold text-foreground px-5 pt-6 pb-2">
      {title}
    </Text>
  );
}
