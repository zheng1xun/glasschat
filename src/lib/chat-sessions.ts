import AsyncStorage from "@react-native-async-storage/async-storage";

/**
 * 真实会话存储：多对话、置顶、重命名、删除、本地持久化（AsyncStorage）。
 * 界面用 useSyncExternalStore(subscribeChatSessions, getSessions) 订阅。
 */
export type StoredMessagePart = { type: string; text?: string };
export type StoredMessage = {
  id: string;
  role: string;
  parts: StoredMessagePart[];
};

export type ChatSession = {
  id: string;
  title: string;
  pinned: boolean;
  createdAt: number;
  updatedAt: number;
  messages: StoredMessage[];
};

export type SessionGroup = {
  label: string;
  data: ChatSession[];
};

const SESSIONS_KEY = "gc_chat_sessions_v1";
const CURRENT_KEY = "gc_current_session_v1";

let sessions: ChatSession[] = [];
let currentId: string | null = null;
let hydrated = false;
const listeners = new Set<() => void>();

function emit() {
  listeners.forEach((listener) => listener());
}

function persist() {
  (async () => {
    try {
      await AsyncStorage.setItem(SESSIONS_KEY, JSON.stringify(sessions));
      if (currentId) {
        await AsyncStorage.setItem(CURRENT_KEY, currentId);
      } else {
        await AsyncStorage.removeItem(CURRENT_KEY);
      }
    } catch {
      // 存储失败不阻断使用
    }
  })();
}

export function subscribeChatSessions(listener: () => void): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

export function getSessions(): ChatSession[] {
  return sessions;
}

export function getCurrentSessionId(): string | null {
  return currentId;
}

export function getSession(id: string): ChatSession | undefined {
  return sessions.find((s) => s.id === id);
}

export function getSessionMessages(id: string): StoredMessage[] {
  return getSession(id)?.messages ?? [];
}

export async function hydrateChatSessions(): Promise<void> {
  if (hydrated) return;
  hydrated = true;
  try {
    const [raw, savedCurrent] = await Promise.all([
      AsyncStorage.getItem(SESSIONS_KEY),
      AsyncStorage.getItem(CURRENT_KEY),
    ]);
    sessions = raw ? (JSON.parse(raw) as ChatSession[]) : [];
    if (savedCurrent && sessions.some((s) => s.id === savedCurrent)) {
      currentId = savedCurrent;
    }
  } catch {
    sessions = [];
  }
  if (!currentId) {
    const newest = [...sessions].sort((a, b) => b.updatedAt - a.updatedAt)[0];
    if (newest) {
      currentId = newest.id;
    } else {
      // 首次启动：建一个空会话
      const now = Date.now();
      const session: ChatSession = {
        id: newId(now),
        title: "新对话",
        pinned: false,
        createdAt: now,
        updatedAt: now,
        messages: [],
      };
      sessions = [session];
      currentId = session.id;
      persist();
    }
  }
  emit();
}

function newId(now: number): string {
  return `s_${now}_${Math.random().toString(36).slice(2, 8)}`;
}

export function createSession(): ChatSession {
  const now = Date.now();
  // 清掉从未使用过的空「新对话」，避免列表堆积
  sessions = sessions.filter((s) => s.messages.length > 0 || s.pinned);
  const session: ChatSession = {
    id: newId(now),
    title: "新对话",
    pinned: false,
    createdAt: now,
    updatedAt: now,
    messages: [],
  };
  sessions = [session, ...sessions];
  currentId = session.id;
  emit();
  persist();
  return session;
}

export function setCurrentSession(id: string): void {
  if (!sessions.some((s) => s.id === id)) return;
  currentId = id;
  emit();
  persist();
}

export function deleteSession(id: string): void {
  sessions = sessions.filter((s) => s.id !== id);
  if (currentId === id) {
    const next = sortedSessions()[0];
    if (next) {
      currentId = next.id;
      emit();
      persist();
      return;
    }
    // 删光了：原地建一个新会话
    currentId = null;
    emit();
    createSession();
    return;
  }
  emit();
  persist();
}

export function renameSession(id: string, title: string): void {
  const trimmed = title.trim();
  if (!trimmed) return;
  sessions = sessions.map((s) => (s.id === id ? { ...s, title: trimmed } : s));
  emit();
  persist();
}

export function togglePinSession(id: string): void {
  sessions = sessions.map((s) =>
    s.id === id ? { ...s, pinned: !s.pinned } : s,
  );
  emit();
  persist();
}

/** 置顶优先，其余按更新时间倒序。 */
export function sortedSessions(): ChatSession[] {
  return [...sessions].sort((a, b) =>
    a.pinned !== b.pinned ? (a.pinned ? -1 : 1) : b.updatedAt - a.updatedAt,
  );
}

/** 流式结束/状态变化时把消息落盘；首条用户消息自动生成标题。 */
export function saveSessionMessages(id: string, messages: StoredMessage[]): void {
  sessions = sessions.map((s) => {
    if (s.id !== id) return s;
    let title = s.title;
    if (title === "新对话") {
      const firstUser = messages.find((m) => m.role === "user");
      const text = firstUser
        ? firstUser.parts
            .filter((p) => p.type === "text" && p.text)
            .map((p) => p.text)
            .join("")
        : "";
      if (text.trim()) {
        title = text.trim().slice(0, 20);
      }
    }
    return { ...s, messages, title, updatedAt: Date.now() };
  });
  emit();
  persist();
}

/** 按时间分组：今天 / 昨天 / 过去 7 天 / 更早（置顶的单独一组排最前）。 */
export function groupSessionsByDate(list: ChatSession[]): SessionGroup[] {
  const now = new Date();
  const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
  const startOfYesterday = startOfToday - 86400000;
  const startOfWeek = startOfToday - 6 * 86400000;

  const pinned: ChatSession[] = [];
  const today: ChatSession[] = [];
  const yesterday: ChatSession[] = [];
  const week: ChatSession[] = [];
  const earlier: ChatSession[] = [];

  for (const s of list) {
    if (s.pinned) {
      pinned.push(s);
    } else if (s.updatedAt >= startOfToday) {
      today.push(s);
    } else if (s.updatedAt >= startOfYesterday) {
      yesterday.push(s);
    } else if (s.updatedAt >= startOfWeek) {
      week.push(s);
    } else {
      earlier.push(s);
    }
  }

  const groups: SessionGroup[] = [];
  if (pinned.length) groups.push({ label: "已置顶", data: pinned });
  if (today.length) groups.push({ label: "今天", data: today });
  if (yesterday.length) groups.push({ label: "昨天", data: yesterday });
  if (week.length) groups.push({ label: "过去 7 天", data: week });
  if (earlier.length) groups.push({ label: "更早", data: earlier });
  return groups;
}
