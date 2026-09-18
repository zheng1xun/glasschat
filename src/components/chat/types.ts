export type ChatMessage = {
  id: string;
  role: "user" | "assistant";
  content: string;
  /** deepseek-reasoner 的思考过程（完整文本，流式结束后） */
  reasoning?: string;
  /** 思考用时（秒） */
  reasoningDuration?: number;
};
