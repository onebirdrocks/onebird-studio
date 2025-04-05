import React, { useState, FC } from 'react';
import { Plus } from 'lucide-react';
import { useChatStore } from '../stores/chatStore';
import { useModelStore } from '../stores/modelStore';
import NewChatDialog from './NewChatDialog';
import type { Model } from '../stores/modelStore';
import { cn } from '../lib/utils';

interface ChatHistoryProps {
  sidebarOpen: boolean;
  onToggleSidebar: () => void;
}

export const ChatHistory: FC<ChatHistoryProps> = ({ sidebarOpen, onToggleSidebar }) => {
  const {
    sortedHistories: histories,
    session: { currentChatId },
    setCurrentChatId,
    createChat,
    deleteChat
  } = useChatStore();

  const { setSelectedModel } = useModelStore();
  const [isDialogOpen, setIsDialogOpen] = useState(false);

  const handleConfirm = async (model: Model) => {
    setSelectedModel(model);
    await createChat(model);
    setIsDialogOpen(false);
  };

  // 格式化时间的辅助函数
  const formatDate = (timestamp: number) => {
    const date = new Date(timestamp);
    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);

    if (date.toDateString() === today.toDateString()) {
      return `今天 ${date.getHours().toString().padStart(2, '0')}:${date.getMinutes().toString().padStart(2, '0')}`;
    } else if (date.toDateString() === yesterday.toDateString()) {
      return `昨天 ${date.getHours().toString().padStart(2, '0')}:${date.getMinutes().toString().padStart(2, '0')}`;
    } else {
      return `${date.getMonth() + 1}月${date.getDate()}日 ${date.getHours().toString().padStart(2, '0')}:${date.getMinutes().toString().padStart(2, '0')}`;
    }
  };

  return (
    <div className="relative h-full">
      {/* 切换按钮 */}
      <button
        onClick={onToggleSidebar}
        className={cn(
          'absolute -right-4 top-1/2 -translate-y-1/2 z-10',
          'w-8 h-8 flex items-center justify-center',
          'bg-gray-100 dark:bg-slate-800',
          'border border-gray-200 dark:border-slate-700',
          'rounded-full shadow-sm',
          'text-gray-500 dark:text-gray-400',
          'hover:text-gray-700 dark:hover:text-gray-300',
          'transition-colors'
        )}
      >
        <svg
          className={cn(
            'w-4 h-4 transition-transform',
            sidebarOpen ? 'rotate-0' : 'rotate-180'
          )}
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <path d="M15 18l-6-6 6-6" />
        </svg>
      </button>

      {/* 聊天历史内容 */}
      <div className={cn(
        'h-full overflow-hidden transition-all duration-300',
        sidebarOpen ? 'opacity-100' : 'opacity-0'
      )}>
        {/* 新建聊天按钮 */}
        <div className="p-4 border-b border-gray-200 dark:border-gray-700">
          <button
            onClick={() => setIsDialogOpen(true)}
            className={cn(
              'w-full px-4 py-2 rounded-lg',
              'bg-blue-500 hover:bg-blue-600',
              'text-white font-medium',
              'flex items-center justify-center gap-2',
              'transition-colors'
            )}
          >
            <Plus className="w-5 h-5" />
            新建聊天
          </button>
        </div>

        {/* 聊天历史列表 */}
        <div className="overflow-y-auto h-[calc(100%-5rem)]">
          <div className="space-y-1 p-2">
            {histories.map((history) => (
              <div
                key={history.id}
                className="flex flex-col px-2"
              >
                <button
                  onClick={() => {
                    setCurrentChatId(history.id);
                    setSelectedModel(history.model);
                  }}
                  className={cn(
                    'w-full rounded-lg',
                    'transition-colors',
                    currentChatId === history.id
                      ? 'bg-gray-200 dark:bg-slate-700'
                      : 'hover:bg-gray-100 dark:hover:bg-slate-800'
                  )}
                >
                  {/* 主要内容 */}
                  <div className="flex items-center gap-2 px-3 py-2">
                    <div className="flex-1 min-w-0">
                      <div className={cn(
                        "truncate font-medium",
                        currentChatId === history.id
                          ? 'text-gray-900 dark:text-white'
                          : 'text-gray-600 dark:text-gray-400'
                      )}>
                        {history.title || '新对话'}
                      </div>
                      {/* 模型名称和时间 */}
                      <div className="text-xs text-gray-500 dark:text-gray-400 mt-0.5 truncate">
                        {history.model.name} · {formatDate(history.createdAt)}
                      </div>
                    </div>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        deleteChat(history.id);
                      }}
                      className={cn(
                        'p-1 rounded-lg',
                        'text-gray-500 hover:text-red-500 dark:text-gray-400 dark:hover:text-red-400',
                        'hover:bg-gray-100 dark:hover:bg-slate-800',
                        'transition-colors'
                      )}
                    >
                      <svg
                        className="w-4 h-4"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      >
                        <path d="M3 6h18" />
                        <path d="M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6" />
                        <path d="M8 6V4a2 2 0 012-2h4a2 2 0 012 2v2" />
                      </svg>
                    </button>
                  </div>
                </button>
              </div>
            ))}
          </div>
        </div>

        {/* 新建聊天对话框 */}
        <NewChatDialog
          isOpen={isDialogOpen}
          onClose={() => setIsDialogOpen(false)}
          onConfirm={handleConfirm}
        />
      </div>
    </div>
  );
} 