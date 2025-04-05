import type { Model } from '../stores/modelStore';

export interface Message {
  role: 'system' | 'user' | 'assistant';
  content: string;
  isThinking?: boolean;
}

export interface ChatHistory {
  id: string;
  title: string;
  messages: Message[];
  model: Model;
  createdAt: number;
  updatedAt: number;
  isTemporaryTitle: boolean;
}

// 聊天会话状态
export interface ChatSessionState {
  currentChatId: string | null;
  isLoading: boolean;
  error: string | null;
}

// 聊天历史状态
export interface ChatHistoryState {
  items: Record<string, ChatHistory>;
  order: string[]; // 保持聊天历史的顺序
}

// UI 状态
export interface ChatUIState {
  isServiceAvailable: boolean;
  isModelAvailable: boolean;
}

// 完整的聊天状态
export interface ChatState {
  session: ChatSessionState;
  history: ChatHistoryState;
  ui: ChatUIState;
}

// 计算属性类型
export interface ChatComputedState {
  currentChat: ChatHistory | null;
  currentMessages: Message[];
  sortedHistories: ChatHistory[];
}

// 聊天操作类型
export type ChatAction = {
  createChat: (model: Model) => string;
  deleteChat: (chatId: string) => void;
  updateChatTitle: (chatId: string, title: string) => void;
  updateChatMessages: (chatId: string, messages: Message[]) => void;
  setCurrentChatId: (chatId: string | null) => void;
  sendMessage: (content: string, model: Model) => Promise<void>;
  clearMessages: () => void;
  generateChatTitle: (chatId: string, firstMessage: string) => Promise<void>;
} 