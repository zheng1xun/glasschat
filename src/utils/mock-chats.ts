export type MockChat = {
  id: string;
  title: string;
  daysAgo: number;
  starred: boolean;
};

export const MOCK_CHATS: MockChat[] = [
  { id: "1", title: "帮我写一份周报", daysAgo: 5, starred: false },
  { id: "2", title: "iOS 26 液态玻璃实现原理", daysAgo: 5, starred: false },
  { id: "3", title: "周末爬山路线推荐", daysAgo: 7, starred: false },
  { id: "4", title: "红烧肉的家常做法", daysAgo: 7, starred: true },
  { id: "5", title: "给猫起名字", daysAgo: 7, starred: false },
  { id: "6", title: "SwiftUI 和 Flutter 怎么选", daysAgo: 14, starred: false },
  { id: "7", title: "通俗解释量子纠缠", daysAgo: 14, starred: true },
  { id: "8", title: "英语邮件润色", daysAgo: 14, starred: false },
  { id: "10", title: "装修预算清单", daysAgo: 14, starred: false },
  { id: "11", title: "三亚五日游攻略", daysAgo: 21, starred: false },
  { id: "12", title: "孩子睡前故事", daysAgo: 28, starred: false },
  { id: "13", title: "健身计划制定", daysAgo: 28, starred: false },
  { id: "14", title: "咖啡拉花技巧", daysAgo: 30, starred: false },
  { id: "15", title: "读书笔记：《三体》", daysAgo: 35, starred: false },
];
