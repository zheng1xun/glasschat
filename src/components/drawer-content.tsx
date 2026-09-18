import "@/global.css";

import { Icon } from "@/components/icon";
import { TouchableGlass } from "@/components/touchable-glass";
import { SafeAreaView } from "@/components/tw";
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
import { cn } from "@/utils/tailwind";
import type { Href } from "expo-router";
import { Plus } from "lucide-react-native";

import React, {
  createContext,
  use,
  useCallback,
  useMemo,
  useState,
  useSyncExternalStore,
} from "react";
import { Alert, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";

type DrawerContextValue = {
  isOpen: boolean;
  openDrawer: () => void;
  closeDrawer: () => void;
};

const DrawerContext = createContext<DrawerContextValue | null>(null);

export function DrawerProvider({ children }: { children: React.ReactNode }) {
  const [isOpen, setIsOpen] = useState(false);

  const openDrawer = useCallback(() => setIsOpen(true), []);
  const closeDrawer = useCallback(() => setIsOpen(false), []);

  return (
    <DrawerContext value={{ isOpen, openDrawer, closeDrawer }}>
      {children}
    </DrawerContext>
  );
}

export function useDrawer() {
  const context = use(DrawerContext);
  if (!context) {
    throw new Error("useDrawer must be used within a DrawerProvider");
  }
  return context;
}

function DrawerNavItem({
  label,
  onPress,
}: {
  label: string;
  onPress: () => void;
}) {
  return (
    <Pressable
      onPress={onPress}
      className="px-4 py-3 mx-2 rounded-[10px] active:bg-muted"
    >
      <Text className="text-base text-foreground">
        {label}
      </Text>
    </Pressable>
  );
}

function DrawerChatItem({
  title,
  onPress,
  onLongPress,
  active,
  pinned,
}: {
  title: string;
  onPress: () => void;
  onLongPress?: () => void;
  active?: boolean;
  pinned?: boolean;
}) {
  return (
    <Pressable
      onPress={onPress}
      onLongPress={onLongPress}
      delayLongPress={400}
      className={cn(
        `px-4 py-2.5 mx-2 rounded-[10px] active:bg-accent`,
        active && "bg-muted",
      )}
    >
      <View className="flex-row items-center gap-1.5">
        {pinned && <Text className="text-[11px]">📌</Text>}
        <Text
          numberOfLines={1}
          className={cn(
            `text-[15px] flex-1`,
            active
              ? "text-foreground"
              : "text-muted-foreground",
          )}
        >
          {title}
        </Text>
      </View>
    </Pressable>
  );
}

/** 长按会话弹出的管理菜单（置顶/重命名/删除） */
function showChatActions(chat: ChatSession) {
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

export function DrawerContent({
  onNavigate,
  onOpenModal,
}: {
  onNavigate: (path: Href) => void;
  onOpenModal: (path: Href) => void;
}) {
  const allSessions = useSyncExternalStore(subscribeChatSessions, getSessions);

  // 按时间分组：已置顶 / 今天 / 昨天 / 过去 7 天 / 更早
  const groups = useMemo(
    () => groupSessionsByDate(sortedSessions()),
    [allSessions],
  );

  return (
    <SafeAreaView
      // NOTE: Some issue with uniwind that prevents updates for this component.
      className="flex-1"
      edges={["top", "bottom", "left"]}
    >
      {/* Header */}
      <View className="px-4 pt-2 pb-3">
        <Text className="text-[28px] font-bold text-foreground">
          琉璃
        </Text>
      </View>

      {/* Nav + Chat history */}
      <ScrollView
        className="flex-1"
        contentContainerStyle={{ paddingBottom: 8 }}
      >
        <DrawerNavItem label="对话记录" onPress={() => onNavigate("/chats")} />
        <DrawerNavItem
          label="设置"
          onPress={() => {
            if (process.env.EXPO_OS === "android") {
              onNavigate("/(settings)/settings");
            }
            onOpenModal("/(settings)/settings");
          }}
        />

        {/* 历史会话（按时间分组，长按管理） */}
        {groups.map((group) => (
          <View key={group.label}>
            <Text className="text-[13px] font-semibold text-muted-foreground px-6 pt-5 pb-1.5">
              {group.label}
            </Text>
            {group.data.map((chat) => (
              <DrawerChatItem
                key={chat.id}
                title={chat.title}
                pinned={chat.pinned}
                onPress={() => {
                  setCurrentSession(chat.id);
                  onNavigate("/");
                }}
                onLongPress={() => showChatActions(chat)}
              />
            ))}
          </View>
        ))}
      </ScrollView>

      {/* Footer */}
      <View
        className="flex-row items-center px-4 py-3 border-t border-border"
        style={{ borderTopWidth: StyleSheet.hairlineWidth }}
      >
        <TouchableGlass
          onPress={() => onOpenModal("/(settings)/settings")}
          className="rounded-full p-2 flex-row items-center gap-2.5 active:opacity-60"
        >
          <View className="w-8 h-8 rounded-full bg-muted items-center justify-center">
            <Text className="text-[13px] font-semibold text-foreground">
              我
            </Text>
          </View>
          <Text className="text-sm text-foreground">
            我的账号
          </Text>
        </TouchableGlass>
        <View className="flex-1" />
        <TouchableGlass
          onPress={() => {
            createSession();
            onNavigate("/");
          }}
          className="w-10 h-10 rounded-full bg-foreground active:bg-muted items-center justify-center"
        >
          <Icon
            icon={Plus}
            className="w-6 h-6 text-background"
          />
        </TouchableGlass>
      </View>
    </SafeAreaView>
  );
}
