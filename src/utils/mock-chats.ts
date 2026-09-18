// 仅 Web 端侧边栏的展示占位数据（移动端用真实会话存储 chat-sessions.ts）
export type MockChat = {
  id: string;
  title: string;
  daysAgo: number;
  starred: boolean;
};

export const MOCK_CHATS: MockChat[] = [
  { id: "1", title: "帮我写一份周报", daysAgo: 0, starred: false },
  { id: "2", title: "iOS 26 液态玻璃实现原理", daysAgo: 1, starred: false },
  { id: "3", title: "周末爬山路线推荐", daysAgo: 3, starred: false },
  { id: "4", title: "红烧肉的家常做法", daysAgo: 7, starred: true },
  { id: "5", title: "三亚五日游攻略", daysAgo: 21, starred: false },
];
