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
              <button
                key={history.id}
                onClick={() => {
                  setCurrentChatId(history.id);
                  setSelectedModel(history.model);
                }}
                className={cn(
                  'w-full px-3 py-2 rounded-lg text-left',
                  'transition-colors truncate',
                  currentChatId === history.id
                    ? 'bg-gray-200 dark:bg-slate-700 text-gray-900 dark:text-white'
                    : 'text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-slate-800'
                )}
              >
                {history.title || '新对话'}
              </button>
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