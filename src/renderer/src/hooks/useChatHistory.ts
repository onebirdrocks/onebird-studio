import { useState, useCallback, useEffect } from 'react';
import { ChatHistory, Message } from '../types/chat';
import { Model } from './useModelSelection';

const STORAGE_KEY = 'chat_histories';

export function useChatHistory() {
  const [histories, setHistories] = useState<ChatHistory[]>(() => {
    const saved = localStorage.getItem(STORAGE_KEY);
    return saved ? JSON.parse(saved) : [];
  });
  const [currentChatId, setCurrentChatId] = useState<string | null>(null);

  // 保存历史记录到 localStorage
  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(histories));
  }, [histories]);

  // 创建新的聊天
  const createNewChat = useCallback((model: Model) => {
    const newChat: ChatHistory = {
      id: Date.now().toString(),
      title: 'New Chat',
      messages: [],
      model,
      createdAt: Date.now(),
      updatedAt: Date.now(),
      isTemporaryTitle: true
    };

    setHistories(prev => [newChat, ...prev]);
    setCurrentChatId(newChat.id);
    return newChat.id;
  }, []);

  // 更新聊天消息
  const updateChatMessages = useCallback((chatId: string, messages: Message[]) => {
    setHistories(prev => prev.map(chat => {
      if (chat.id === chatId) {
        return {
          ...chat,
          messages,
          updatedAt: Date.now()
        };
      }
      return chat;
    }));
  }, []);

  // 更新聊天标题
  const updateChatTitle = useCallback((chatId: string, title: string) => {
    setHistories(prev => prev.map(chat => {
      if (chat.id === chatId) {
        return {
          ...chat,
          title,
          isTemporaryTitle: false,
          updatedAt: Date.now()
        };
      }
      return chat;
    }));
  }, []);

  // 获取当前聊天
  const getCurrentChat = useCallback(() => {
    return histories.find(chat => chat.id === currentChatId);
  }, [histories, currentChatId]);

  // 删除聊天
  const deleteChat = useCallback((chatId: string) => {
    setHistories(prev => prev.filter(chat => chat.id !== chatId));
    if (currentChatId === chatId) {
      setCurrentChatId(null);
    }
  }, [currentChatId]);

  // 生成聊天标题
  const generateChatTitle = useCallback(async (chatId: string, firstMessage: string) => {
    const chat = histories.find(c => c.id === chatId);
    if (!chat || !chat.isTemporaryTitle) return;

    try {
      // 这里应该调用模型来生成标题
      // 暂时使用消息的前20个字符作为标题
      const title = firstMessage.slice(0, 20) + (firstMessage.length > 20 ? '...' : '');
      updateChatTitle(chatId, title);
    } catch (error) {
      console.error('Error generating chat title:', error);
    }
  }, [histories, updateChatTitle]);

  return {
    histories,
    currentChatId,
    setCurrentChatId,
    createNewChat,
    updateChatMessages,
    updateChatTitle,
    getCurrentChat,
    deleteChat,
    generateChatTitle
  };
} 