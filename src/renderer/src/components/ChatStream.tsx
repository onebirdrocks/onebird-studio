import React, { useRef, useEffect, useState, useCallback, useLayoutEffect } from 'react';
import { useChatStore } from '../stores/chatStore';
import { useModelStore } from '../stores/modelStore';
import { useSettingStore } from '../stores/settingStore';
import { Message } from '../types/chat';
import { MessageItem } from './MessageItem';
import { cn } from '../lib/utils';

export function ChatStream() {
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const messageListRef = useRef<HTMLDivElement>(null);
  const { 
    currentMessages: messages, 
    session: { isLoading, error, currentChatId }, 
    sendMessage,
    setCurrentChatId 
  } = useChatStore();
  const { selectedModel } = useModelStore();
  const { fontSize, fontFamily } = useSettingStore();
  
  // 跟踪最后一条消息的内容
  const lastMessageRef = useRef<string>('');
  const [autoScroll, setAutoScroll] = useState(true);
  const [isNearBottom, setIsNearBottom] = useState(true);

  // 在切换聊天时重置状态
  useEffect(() => {
    lastMessageRef.current = '';
    setAutoScroll(true);
    setIsNearBottom(true);
    scrollToBottom(true);
  }, [currentChatId]);

  // 检查是否接近底部
  const checkIfNearBottom = useCallback(() => {
    if (messageListRef.current) {
      const { scrollTop, scrollHeight, clientHeight } = messageListRef.current;
      const scrollPosition = scrollHeight - scrollTop - clientHeight;
      return scrollPosition < 100;
    }
    return true;
  }, []);

  // 滚动到底部
  const scrollToBottom = useCallback((force = false) => {
    if (!messageListRef.current || (!isNearBottom && !force)) return;

    const scrollElement = messageListRef.current;
    const scrollHeight = scrollElement.scrollHeight;
    
    // 使用 scrollTo 而不是 scrollTop，确保跨浏览器兼容性
    scrollElement.scrollTo({
      top: scrollHeight,
      behavior: 'instant' // 使用 instant 而不是 smooth，避免滚动动画导致的问题
    });
  }, [isNearBottom]);

  // 处理滚动事件
  const handleScroll = useCallback(() => {
    if (!messageListRef.current) return;
    const isNear = checkIfNearBottom();
    setIsNearBottom(isNear);
    setAutoScroll(isNear);
  }, [checkIfNearBottom]);

  // 监听消息变化
  useEffect(() => {
    const lastMessage = messages[messages.length - 1];
    const currentContent = lastMessage?.content || '';
    
    if (currentContent !== lastMessageRef.current) {
      lastMessageRef.current = currentContent;
      
      // 使用 requestAnimationFrame 确保在下一帧渲染时滚动
      if (autoScroll) {
        requestAnimationFrame(() => {
          scrollToBottom();
        });
      }
    }
  }, [messages, autoScroll, scrollToBottom]);

  // 监听加载状态变化
  useEffect(() => {
    if (isLoading) {
      setAutoScroll(true);
      setIsNearBottom(true);
      requestAnimationFrame(() => {
        scrollToBottom(true);
      });
    }
  }, [isLoading, scrollToBottom]);

  // 组件挂载时滚动到底部
  useEffect(() => {
    scrollToBottom(true);
  }, []);

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
    <div className="flex flex-col h-full relative">
      <div 
        ref={messageListRef}
        onScroll={handleScroll}
        className={cn(
          "flex-1 overflow-y-auto",
          "scroll-smooth",
          getFontFamilyClass()
        )}
        style={{ 
          fontSize: `${fontSize}px`,
          height: 'calc(100vh - 180px)', // 固定高度
          overflowY: 'auto',
          overscrollBehavior: 'contain', // 防止滚动穿透
          WebkitOverflowScrolling: 'touch' // 在移动设备上提供更平滑的滚动
        }}
      >
        <div className="p-4 space-y-6">
          {messages?.map((message: Message, index: number) => (
            <MessageItem key={index} message={message} />
          ))}
          <div 
            ref={messagesEndRef}
            className="h-4" // 给一个小高度确保有足够的滚动空间
          />
        </div>
      </div>

      {/* 滚动到底部按钮 */}
      {!isNearBottom && (
        <button
          onClick={() => {
            setAutoScroll(true);
            setIsNearBottom(true);
            scrollToBottom(true);
          }}
          className={cn(
            "fixed bottom-28 right-8",
            "p-3 rounded-full bg-blue-500 text-white",
            "shadow-lg hover:bg-blue-600 transition-colors",
            "flex items-center justify-center z-50",
            "animate-bounce"
          )}
          title="滚动到底部"
        >
          <svg 
            className="w-5 h-5" 
            fill="none" 
            stroke="currentColor" 
            viewBox="0 0 24 24"
          >
            <path 
              strokeLinecap="round" 
              strokeLinejoin="round" 
              strokeWidth={2} 
              d="M19 14l-7 7m0 0l-7-7m7 7V3" 
            />
          </svg>
        </button>
      )}

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