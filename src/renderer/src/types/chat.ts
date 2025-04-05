import type { Model } from '../stores/modelStore';

export interface Message {
  role: 'system' | 'user' | 'assistant';
  content: string;
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

export interface ChatState {
  histories: ChatHistory[];
  currentChatId: string | null;
} 