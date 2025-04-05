import React, { useState } from 'react';
import { Plus } from 'lucide-react';
import { useChatStore } from '../stores/chatStore';
import { useModelStore } from '../stores/modelStore';
import NewChatDialog from './NewChatDialog';
import type { Model } from '../stores/modelStore';

export function ChatHistory() {
  const {
    sortedHistories: histories,
    session: { currentChatId },
    setCurrentChatId,
    deleteChat,
    createChat
  } = useChatStore();

  const { setSelectedModel } = useModelStore();
  const [isDialogOpen, setIsDialogOpen] = useState(false);

  const handleConfirm = async (model: Model) => {
    setSelectedModel(model);
    await createChat(model);
    setIsDialogOpen(false);
  };

  return (
    <div className="h-full flex flex-col bg-white dark:bg-gray-900">
      {/* 新建聊天按钮 */}
      <div className="p-4 border-b border-gray-200 dark:border-gray-700">
        <button
          onClick={() => setIsDialogOpen(true)}
          className="w-full flex items-center justify-center gap-2 px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 dark:hover:bg-blue-700"
        >
          <Plus size={20} />
          <span>新建聊天</span>
        </button>
      </div>

      {/* 聊天历史列表 */}
      <div className="flex-1 overflow-y-auto">
        <div className="p-4 space-y-2">
          {histories?.map(chat => (
            <div
              key={chat.id}
              className={`p-3 rounded cursor-pointer flex justify-between items-center transition-colors ${
                chat.id === currentChatId 
                  ? 'bg-blue-100 dark:bg-blue-900/50' 
                  : 'hover:bg-gray-100 dark:hover:bg-gray-800'
              }`}
              onClick={() => {
                setCurrentChatId(chat.id);
                setSelectedModel(chat.model);
              }}
            >
              <div className="flex-1 min-w-0">
                <div className="font-medium truncate dark:text-white">
                  {chat.title}
                </div>
                <div className="text-xs text-gray-500 dark:text-gray-400 flex items-center gap-2">
                  <span>{new Date(chat.updatedAt).toLocaleDateString()}</span>
                  <span className="text-xs text-gray-400 dark:text-gray-500">·</span>
                  <span className="truncate">{chat.model.name}</span>
                </div>
              </div>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  deleteChat(chat.id);
                }}
                className="ml-2 text-gray-400 hover:text-red-500 dark:hover:text-red-400"
              >
                ×
              </button>
            </div>
          ))}
        </div>
      </div>

      <NewChatDialog
        isOpen={isDialogOpen}
        onClose={() => setIsDialogOpen(false)}
        onConfirm={handleConfirm}
      />
    </div>
  );
} 