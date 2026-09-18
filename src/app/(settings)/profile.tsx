import { useState } from "react";
import { Pressable, ScrollView, Text, TextInput, View } from "react-native";

export default function ProfileScreen() {
  const [fullName, setFullName] = useState("");
  const [nickname, setNickname] = useState("");
  const [preferences, setPreferences] = useState("我喜欢简洁直接的回答。");

  return (
    <ScrollView
      className="flex-1 bg-background text-foreground"
      contentInsetAdjustmentBehavior="automatic"
      contentContainerClassName="px-5 pb-10"
      keyboardDismissMode="interactive"
    >
      {/* 姓名 */}
      <Text className="text-[13px] font-medium text-muted-foreground mt-6 mb-2">
        姓名
      </Text>
      <TextInput
        value={fullName}
        onChangeText={setFullName}
        className="bg-muted rounded-xl px-4 py-3 text-[17px] text-foreground border-continuous"
        placeholderTextColor="#999"
      />

      {/* 昵称 */}
      <Text className="text-[13px] font-medium text-muted-foreground mt-5 mb-2">
        昵称
      </Text>
      <TextInput
        value={nickname}
        onChangeText={setNickname}
        className="bg-muted rounded-xl px-4 py-3 text-[17px] text-foreground border-continuous"
        placeholderTextColor="#999"
      />

      {/* 更新资料按钮 */}
      <Pressable
        className="bg-foreground rounded-xl mt-6 py-3.5 items-center active:opacity-80 border-continuous"
      >
        <Text className="text-[17px] font-semibold text-background">
          更新资料
        </Text>
      </Pressable>

      {/* 分割线 */}
      <View className="h-px bg-border my-6" />

      {/* 个人偏好 */}
      <Text className="text-[15px] font-medium text-muted-foreground mb-2">
        个人偏好
      </Text>
      <TextInput
        value={preferences}
        onChangeText={setPreferences}
        multiline
        className="bg-muted rounded-xl px-4 py-3 text-[15px] text-foreground leading-relaxed min-h-[140px] border-continuous"
        style={{ textAlignVertical: "top" }}
        placeholderTextColor="#999"
      />
      <Text className="text-[13px] text-muted-foreground mt-2 leading-relaxed">
        你的偏好会应用到所有对话中。
      </Text>

      {/* 保存偏好按钮 */}
      <Pressable
        className="bg-muted rounded-xl mt-4 py-3.5 items-center active:opacity-80 border-continuous"
      >
        <Text className="text-[17px] font-semibold text-muted-foreground">
          保存偏好
        </Text>
      </Pressable>

      {/* 分割线 */}
      <View className="h-px bg-border my-6" />

      {/* 删除账号 */}
      <Pressable className="flex-row items-center gap-2 active:opacity-60">
        <Text className="text-[17px] text-red-500">删除账号</Text>
      </Pressable>
    </ScrollView>
  );
}
