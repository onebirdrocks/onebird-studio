import React, { useRef, useEffect } from 'react';
import { useChatStore } from '../stores/chatStore';
import { useModelStore } from '../stores/modelStore';
import { useSettingStore } from '../stores/settingStore';
import { Message } from '../types/chat';
import { MessageItem } from './MessageItem';
import { cn } from '../lib/utils';

export function ChatStream() {
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const { currentMessages: messages, session: { isLoading, error }, sendMessage } = useChatStore();
  const { selectedModel } = useModelStore();
  const { fontSize, fontFamily } = useSettingStore();

  useEffect(() => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages]);

  const getFontFamilyClass = () => {
    switch (fontFamily) {
      case 'inter':
        return 'font-inter'
      case 'roboto':
        return 'font-roboto'
      case 'sourceHanSans':
        return 'font-source-han-sans'
      default:
        return 'font-sans'
    }
  }

  const handleSendMessage = async (content: string) => {
    if (!selectedModel) {
      console.error('No model selected');
      return;
    }
    try {
      await sendMessage(content, selectedModel);
    } catch (err) {
      console.error('Failed to send message:', err);
    }
  };

  if (!selectedModel) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-gray-500 dark:text-gray-400">
          请先选择一个模型
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full">
      <div 
        className={cn(
          "flex-1 overflow-y-auto p-4 space-y-4",
          getFontFamilyClass()
        )}
        style={{ fontSize: `${fontSize}px` }}
      >
        {messages?.map((message: Message, index: number) => (
          <MessageItem key={index} message={message} />
        ))}
        <div ref={messagesEndRef} />
      </div>

      {error && (
        <div className="p-4 bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400">
          {error}
        </div>
      )}

      <div className="p-4 border-t border-gray-200 dark:border-gray-700">
        <form
          onSubmit={(e) => {
            e.preventDefault();
            const input = e.currentTarget.elements.namedItem('message') as HTMLInputElement;
            if (input.value.trim()) {
              handleSendMessage(input.value.trim());
              input.value = '';
            }
          }}
          className="flex gap-2"
        >
          <input
            type="text"
            name="message"
            placeholder="输入消息..."
            className={cn(
              "flex-1 p-2 border rounded dark:bg-gray-700 dark:border-gray-600 dark:text-white",
              getFontFamilyClass()
            )}
            style={{ fontSize: `${fontSize}px` }}
            disabled={isLoading}
          />
          <button
            type="submit"
            disabled={isLoading}
            className={cn(
              "px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 disabled:opacity-50",
              getFontFamilyClass()
            )}
            style={{ fontSize: `${fontSize}px` }}
          >
            {isLoading ? '发送中...' : '发送'}
          </button>
        </form>
      </div>
    </div>
  );
} 