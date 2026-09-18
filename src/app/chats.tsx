import { useDrawer } from "@/components/drawer-content";
import { Icon } from "@/components/icon";
import { Image } from "@/components/tw";
import {
  createSession,
  deleteSession,
  getSessions,
  groupSessionsByDate,
  renameSession,
  setCurrentSession,
  sortedSessions,
  subscribeChatSessions,
  togglePinSession,
  type ChatSession,
} from "@/lib/chat-sessions";
import { isLiquidGlassAvailable } from "expo-glass-effect";
import { Color, Stack, useRouter } from "expo-router";
import { ChevronRight, Menu, Search } from "lucide-react-native";
import { useMemo, useState, useSyncExternalStore } from "react";
import {
  Alert,
  Pressable,
  SectionList,
  Text,
  View,
} from "react-native";

function formatTime(updatedAt: number): string {
  const days = Math.floor((Date.now() - updatedAt) / 86400000);
  if (days < 1) {
    return new Date(updatedAt).toLocaleTimeString("zh-CN", {
      hour: "2-digit",
      minute: "2-digit",
    });
  }
  if (days === 1) return "昨天";
  if (days < 7) return `${days} 天前`;
  return `${Math.round(days / 7)} 周前`;
}

function ChatRow({ item }: { item: ChatSession }) {
  const router = useRouter();
  return (
    <Pressable
      className="flex-row items-center px-5 py-4 active:bg-card"
      onPress={() => {
        setCurrentSession(item.id);
        router.replace("/", { withAnchor: true });
      }}
      onLongPress={() => showActions(item)}
      delayLongPress={400}
    >
      <View className="flex-1 gap-0.5 mr-3">
        <View className="flex-row items-center gap-1.5">
          {item.pinned && <Text className="text-[11px]">📌</Text>}
          <Text
            numberOfLines={1}
            className="text-[17px] text-foreground flex-1"
            selectable
          >
            {item.title}
          </Text>
        </View>
        <Text className="text-[13px] text-muted-foreground">
          {formatTime(item.updatedAt)}
        </Text>
      </View>
      {process.env.EXPO_OS === "ios" ? (
        <Image
          source="sf:chevron.right"
          className="w-2.5 h-4 font-medium text-muted-foreground"
        />
      ) : (
        <Icon icon={ChevronRight} className="w-2.5 h-4 text-muted-foreground" />
      )}
    </Pressable>
  );
}

function showActions(chat: ChatSession) {
  Alert.alert(chat.title, undefined, [
    {
      text: chat.pinned ? "取消置顶" : "置顶",
      onPress: () => togglePinSession(chat.id),
    },
    {
      text: "重命名",
      onPress: () => {
        Alert.prompt(
          "重命名对话",
          undefined,
          [
            { text: "取消", style: "cancel" },
            {
              text: "好",
              onPress: (value?: string) => {
                if (value?.trim()) renameSession(chat.id, value);
              },
            },
          ],
          "plain-text",
          chat.title,
        );
      },
    },
    {
      text: "删除",
      style: "destructive",
      onPress: () => {
        Alert.alert("删除对话", `确定删除「${chat.title}」吗？`, [
          { text: "取消", style: "cancel" },
          {
            text: "删除",
            style: "destructive",
            onPress: () => deleteSession(chat.id),
          },
        ]);
      },
    },
    { text: "取消", style: "cancel" },
  ]);
}

function EmptySearch({ query }: { query: string }) {
  return (
    <View className="flex-1 items-center justify-center pt-32 gap-2">
      <Icon icon={Search} className="w-10 h-10 text-muted-foreground" />
      <Text className="text-[17px] text-muted-foreground text-center px-10">
        没有找到「{query}」相关的对话
      </Text>
    </View>
  );
}

export default function ChatsScreen() {
  const [search, setSearch] = useState("");
  const allSessions = useSyncExternalStore(subscribeChatSessions, getSessions);

  const sections = useMemo(() => {
    let list = sortedSessions();
    if (search) {
      const q = search.toLowerCase();
      list = list.filter(
        (c) =>
          c.title.toLowerCase().includes(q) ||
          c.messages.some((m) =>
            m.parts.some((p) => p.text?.toLowerCase().includes(q)),
          ),
      );
    }
    return groupSessionsByDate(list);
  }, [search, allSessions]);

  return (
    <>
      <SectionList
        sections={sections}
        keyExtractor={(item) => item.id}
        contentInsetAdjustmentBehavior="automatic"
        automaticallyAdjustContentInsets
        automaticallyAdjustsScrollIndicatorInsets
        automaticallyAdjustKeyboardInsets
        contentContainerClassName="android:pb-safe pb-0"
        renderItem={({ item }) => <ChatRow item={item} />}
        renderSectionHeader={({ section }) => (
          <Text className="text-[13px] font-semibold text-muted-foreground px-6 pt-5 pb-1.5 bg-background">
            {section.label}
          </Text>
        )}
        ListEmptyComponent={
          search ? (
            <EmptySearch query={search} />
          ) : (
            <View className="flex-1 items-center justify-center pt-32">
              <Text className="text-[17px] text-muted-foreground">
                暂无对话记录
              </Text>
            </View>
          )
        }
        stickySectionHeadersEnabled={false}
      />

      <Stack.SearchBar
        placeholder="搜索对话内容"
        hideWhenScrolling={false}
        onChangeText={(e) => setSearch(e.nativeEvent.text)}
        onCancelButtonPress={() => setSearch("")}
      />

      <LeftToolbar />
      <BottomToolbar />
    </>
  );
}

function LeftToolbar() {
  const { openDrawer } = useDrawer();

  if (process.env.EXPO_OS === "android") {
    return (
      <Stack.Toolbar placement="left" asChild>
        <Pressable
          onPress={openDrawer}
          accessibilityLabel="打开抽屉"
          accessibilityRole="button"
          className="p-2 -ml-1 active:opacity-60"
        >
          <Icon icon={Menu} className="w-6 h-6 text-foreground" />
        </Pressable>
      </Stack.Toolbar>
    );
  }
  return (
    <Stack.Toolbar placement="left">
      <Stack.Toolbar.Button icon="list.bullet" onPress={openDrawer} />
    </Stack.Toolbar>
  );
}

function BottomToolbar() {
  const router = useRouter();

  return (
    <Stack.Toolbar placement="bottom">
      {isLiquidGlassAvailable() && (
        <Stack.Toolbar.SearchBarSlot separateBackground />
      )}
      <Stack.Toolbar.Button
        tintColor={Color.ios.label}
        icon="square.and.pencil"
        onPress={() => {
          createSession();
          router.navigate("/");
        }}
        separateBackground
      />
    </Stack.Toolbar>
  );
}
