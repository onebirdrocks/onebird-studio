import { FC } from 'react'
import { useChatStore } from './stores/chatStore'
import { useModelStore } from './stores/modelStore'
import { MessageItem } from './components/MessageItem'

const Chat: FC = () => {
  const {
    currentMessages: messages,
    session: { isLoading, error },
    sendMessage
  } = useChatStore()
  
  const { selectedModel } = useModelStore()

  if (!selectedModel) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-gray-500 dark:text-gray-400">
          请先选择一个模型
        </div>
      </div>
    )
  }

  return (
    <div className="flex flex-col h-full">
      {/* 消息列表 */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.map((message, index) => (
          <MessageItem key={index} message={message} />
        ))}
      </div>

      {/* 输入框 */}
      <div className="border-t border-gray-200 dark:border-gray-700 p-4 bg-white dark:bg-slate-900">
        <div className="flex gap-2">
          <input
            type="text"
            placeholder="输入消息..."
            className="flex-1 px-4 py-2 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-slate-800 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault()
                const input = e.currentTarget
                if (input.value.trim()) {
                  sendMessage(input.value, selectedModel)
                  input.value = ''
                }
              }
            }}
          />
          <button
            className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors disabled:bg-gray-300 dark:disabled:bg-gray-700 disabled:cursor-not-allowed"
            onClick={() => {
              const input = document.querySelector('input')
              if (input && input.value.trim()) {
                sendMessage(input.value, selectedModel)
                input.value = ''
              }
            }}
          >
            发送
          </button>
        </div>
      </div>
    </div>
  )
}

export default Chat