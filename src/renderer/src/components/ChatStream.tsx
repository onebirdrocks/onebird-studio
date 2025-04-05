import React, { useRef, useEffect, useState, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { useChatStore } from '../stores/chatStore';
import { useModelStore } from '../stores/modelStore';
import { useSettingStore } from '../stores/settingStore';
import { Message } from '../types/chat';
import { MessageItem } from './MessageItem';
import { cn } from '../lib/utils';

// 调试面板组件
function DebugPanel({ debugInfo, isNearBottom, shouldAutoScroll }: {
  debugInfo: {
    scrollTop: number;
    scrollHeight: number;
    clientHeight: number;
    distanceToBottom: number;
  };
  isNearBottom: boolean;
  shouldAutoScroll: boolean;
}) {
  return (
    <div 
      style={{
        position: 'fixed',
        top: '20px',
        right: '20px',
        backgroundColor: '#2563eb',
        color: 'white',
        padding: '16px',
        borderRadius: '8px',
        boxShadow: '0 4px 6px rgba(0, 0, 0, 0.1)',
        zIndex: 99999,
        fontSize: '14px',
        width: '300px',
        pointerEvents: 'none',
        opacity: 0.9,
        border: '2px solid white'
      }}
    >
      <div style={{ fontWeight: 'bold', marginBottom: '8px', textShadow: '1px 1px 2px rgba(0,0,0,0.3)' }}>调试信息面板</div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
        <div>滚动位置: {Math.round(debugInfo.scrollTop)}</div>
        <div>总高度: {Math.round(debugInfo.scrollHeight)}</div>
        <div>可视高度: {Math.round(debugInfo.clientHeight)}</div>
        <div>距离底部: {Math.round(debugInfo.distanceToBottom)}px</div>
        <div>是否在底部: <span style={{ color: isNearBottom ? '#86efac' : '#fca5a5' }}>{isNearBottom ? '是' : '否'}</span></div>
        <div>自动滚动: <span style={{ color: shouldAutoScroll ? '#86efac' : '#fca5a5' }}>{shouldAutoScroll ? '开启' : '关闭'}</span></div>
      </div>
    </div>
  );
}

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
  
  const [shouldAutoScroll, setShouldAutoScroll] = useState(true);
  const [isNearBottom, setIsNearBottom] = useState(true);
  const [debugInfo, setDebugInfo] = useState({
    scrollTop: 0,
    scrollHeight: 0,
    clientHeight: 0,
    distanceToBottom: 0
  });

  // 检查是否接近底部
  const checkIfNearBottom = useCallback(() => {
    if (messageListRef.current) {
      const { scrollTop, scrollHeight, clientHeight } = messageListRef.current;
      const scrollPosition = scrollHeight - scrollTop - clientHeight;
      const isNear = scrollPosition < 100;
      setIsNearBottom(isNear);
      setShouldAutoScroll(isNear);
      
      // 更新调试信息
      const newDebugInfo = {
        scrollTop,
        scrollHeight,
        clientHeight,
        distanceToBottom: scrollPosition
      };
      setDebugInfo(newDebugInfo);

      // 更新调试面板
      const debugPanel = document.getElementById('debug-panel');
      if (debugPanel) {
        debugPanel.innerHTML = `
          <div style="margin-bottom: 8px; font-weight: bold;">📊 滚动调试</div>
          <div style="display: flex; flex-direction: column; gap: 4px;">
            <div>位置: ${Math.round(scrollTop)}px</div>
            <div>总高: ${Math.round(scrollHeight)}px</div>
            <div>可视: ${Math.round(clientHeight)}px</div>
            <div>底部: ${Math.round(scrollPosition)}px</div>
            <div>底部? <span style="color: ${isNear ? '#86efac' : '#fca5a5'}">${isNear ? '是' : '否'}</span></div>
            <div>自动? <span style="color: ${shouldAutoScroll ? '#86efac' : '#fca5a5'}">${shouldAutoScroll ? '开' : '关'}</span></div>
          </div>
        `;
      }
      
      return isNear;
    }
    return true;
  }, [shouldAutoScroll]);

  // 组件挂载和更新时的处理
  useEffect(() => {
    console.log('ChatStream mounted');
    
    // 每次渲染时都打印状态
    console.log('Debug State:', {
      messagesCount: messages.length,
      isLoading,
      currentChatId,
      shouldAutoScroll,
      isNearBottom,
      debugInfo
    });

    // 创建调试面板
    const debugDiv = document.createElement('div');
    debugDiv.id = 'debug-panel';
    debugDiv.style.cssText = `
      position: fixed;
      top: 10px;
      right: 10px;
      background-color: #2563eb;
      color: white;
      padding: 12px;
      border-radius: 8px;
      box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
      font-size: 14px;
      z-index: 99999;
      border: 2px solid white;
      min-width: 200px;
      pointer-events: none;
    `;
    document.body.appendChild(debugDiv);

    // 立即更新一次调试信息
    checkIfNearBottom();

    return () => {
      console.log('ChatStream unmounted');
      debugDiv.remove();
    };
  }, []);

  // 定期更新调试信息
  useEffect(() => {
    const timer = setInterval(checkIfNearBottom, 1000);
    return () => clearInterval(timer);
  }, [checkIfNearBottom]);

  // 滚动到底部
  const scrollToBottom = useCallback(() => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, []);

  // 强制滚动到底部（无动画）
  const forceScrollToBottom = useCallback(() => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: 'auto' });
    }
  }, []);

  // 处理滚动事件
  const handleScroll = useCallback(() => {
    checkIfNearBottom();
  }, [checkIfNearBottom]);

  // 监听消息变化
  useEffect(() => {
    if (shouldAutoScroll) {
      scrollToBottom();
    }
  }, [messages, shouldAutoScroll]);

  // 监听最后一条消息的内容变化
  useEffect(() => {
    const lastMessage = messages[messages.length - 1];
    if (!lastMessage) return;

    const messageElement = document.getElementById(`message-${messages.length - 1}`);
    if (!messageElement) return;

    const observer = new MutationObserver(() => {
      if (shouldAutoScroll) {
        scrollToBottom();
      }
    });

    observer.observe(messageElement, {
      childList: true,
      subtree: true,
      characterData: true,
    });

    return () => observer.disconnect();
  }, [messages.length, shouldAutoScroll]);

  // 监听加载状态变化
  useEffect(() => {
    if (isLoading) {
      setShouldAutoScroll(true);
      forceScrollToBottom();
    }
  }, [isLoading]);

  // 监听聊天ID变化
  useEffect(() => {
    setShouldAutoScroll(true);
    forceScrollToBottom();
  }, [currentChatId]);

  // 添加调试日志
  useEffect(() => {
    console.log('调试信息:', {
      debugInfo,
      isNearBottom,
      shouldAutoScroll,
      messagesLength: messages.length,
      isLoading,
      currentChatId
    });
  }, [debugInfo, isNearBottom, shouldAutoScroll, messages.length, isLoading, currentChatId]);

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

  // 添加简单的控制台日志
  console.log('ChatStream rendered');

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
          "flex-1 overflow-y-auto p-4 space-y-4",
          "scroll-smooth",
          getFontFamilyClass()
        )}
      >
        {messages.map((message, index) => (
          <MessageItem 
            key={index} 
            message={message} 
            id={`message-${index}`}
          />
        ))}
        <div ref={messagesEndRef} style={{ height: '1px', width: '100%' }} />
      </div>

      {!isNearBottom && (
        <button
          onClick={() => {
            setShouldAutoScroll(true);
            forceScrollToBottom();
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

      {/* Input area */}
      <div className="p-4 border-t border-gray-200 dark:border-gray-700">
        <form
          onSubmit={(e) => {
            e.preventDefault();
            const input = e.currentTarget.elements.namedItem('message') as HTMLInputElement;
            if (input.value.trim()) {
              setShouldAutoScroll(true);
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