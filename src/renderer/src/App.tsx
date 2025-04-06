import { useState, useEffect } from 'react'
import { Sun, Moon, Settings, ChevronLeft, ChevronRight } from 'lucide-react'
import { ChatHistory } from './components/ChatHistory'
import { ChatStream } from './components/ChatStream'
import { useModelStore } from './stores/modelStore'
import { useSettingStore } from './stores/settingStore'
import { useChatStore } from './stores/chatStore'
import { cn } from './lib/utils'
import NewChatDialog from './components/NewChatDialog'
import { SettingsPanel } from './components/SettingsPanel'

function App(): JSX.Element {
  const [isDark, setIsDark] = useState(false)
  const [error, setError] = useState<Error | null>(null)
  const [isSettingsOpen, setIsSettingsOpen] = useState(false)
  const [isSidebarOpen, setIsSidebarOpen] = useState(true)
  const [isNewChatOpen, setIsNewChatOpen] = useState(false)
  const { fontSize, fontFamily } = useSettingStore()
  const {
    apiKeys,
    setApiKey,
    removeApiKey,
    selectedModel,
    setSelectedModel
  } = useModelStore()
  const {
    sortedHistories,
    session: { currentChatId },
    setCurrentChatId,
    initializeStore
  } = useChatStore()

  const [openaiKey, setOpenaiKey] = useState(apiKeys.openai || '')
  const [deepseekKey, setDeepseekKey] = useState(apiKeys.deepseek || '')

  // 初始化聊天历史
  useEffect(() => {
    initializeStore()
  }, [])

  // 当选择模型变化时，确保聊天历史被加载
  useEffect(() => {
    if (selectedModel && sortedHistories.length > 0 && !currentChatId) {
      const latestChat = sortedHistories[0]
      setCurrentChatId(latestChat.id)
      setSelectedModel(latestChat.model)
    }
  }, [selectedModel, sortedHistories, currentChatId])

  // 应用字体设置
  useEffect(() => {
    document.documentElement.style.fontSize = `${fontSize}px`
  }, [fontSize])

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

  const toggleTheme = () => {
    setIsDark(!isDark)
    document.documentElement.classList.toggle('dark')
  }

  const handleSaveKeys = () => {
    if (openaiKey.trim()) {
      setApiKey('openai', openaiKey.trim())
    } else {
      removeApiKey('openai')
    }

    if (deepseekKey.trim()) {
      setApiKey('deepseek', deepseekKey.trim())
    } else {
      removeApiKey('deepseek')
    }

    setIsSettingsOpen(false)
  }

  if (error) {
    return (
      <div className="flex items-center justify-center h-screen bg-red-50 dark:bg-red-900/20">
        <div className="max-w-md p-6 bg-white dark:bg-gray-800 rounded-lg shadow-lg">
          <h2 className="text-xl font-semibold text-red-600 dark:text-red-400 mb-4">
            应用程序错误
          </h2>
          <p className="text-gray-600 dark:text-gray-300 mb-4">
            {error.message}
          </p>
          <button
            onClick={() => window.location.reload()}
            className="px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700"
          >
            重新加载应用
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className={cn("flex h-screen bg-white dark:bg-gray-900", getFontFamilyClass())}>
      {/* 左侧图标栏 */}
      <div className="w-16 border-r border-gray-200 dark:border-gray-700 p-4 flex flex-col items-center">
        <button
          onClick={toggleTheme}
          className="p-2 text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white"
        >
          {isDark ? <Sun size={24} /> : <Moon size={24} />}
        </button>
        <button
          onClick={() => setIsSettingsOpen(true)}
          className="p-2 mt-4 text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white"
        >
          <Settings size={24} />
        </button>
      </div>

      {/* 中间聊天历史栏 */}
      <div className={`${isSidebarOpen ? 'w-64' : 'w-0'} transition-all duration-300 border-r border-gray-200 dark:border-gray-700 flex flex-col relative`}>
        <div className={`${isSidebarOpen ? 'opacity-100' : 'opacity-0'} transition-opacity duration-300 h-full flex flex-col`}>
          <div className="flex-1 overflow-hidden">
            <ChatHistory sidebarOpen={isSidebarOpen} onToggleSidebar={() => setIsSidebarOpen(!isSidebarOpen)} />
          </div>
          {/* 设置面板 - 固定在底部 */}
          <div className="flex-shrink-0 border-t border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900">
            <SettingsPanel />
          </div>
        </div>
        <button
          onClick={() => setIsSidebarOpen(!isSidebarOpen)}
          className="absolute -right-4 top-1/2 transform -translate-y-1/2 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-full p-1 shadow-lg"
        >
          {isSidebarOpen ? <ChevronLeft size={16} /> : <ChevronRight size={16} />}
        </button>
      </div>

      {/* 右侧聊天区域 */}
      <div className="flex-1">
        {selectedModel ? (
          <ChatStream />
        ) : (
          <div className="flex items-center justify-center h-full">
            <button
              onClick={() => setIsNewChatOpen(true)}
              className="px-6 py-3 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors"
            >
              选择模型开始聊天
            </button>
          </div>
        )}
      </div>

      {/* 新建聊天对话框 */}
      <NewChatDialog
        isOpen={isNewChatOpen}
        onClose={() => setIsNewChatOpen(false)}
        onConfirm={(model) => {
          setSelectedModel(model)
          setIsNewChatOpen(false)
        }}
      />

      {/* API 密钥设置对话框 */}
      {isSettingsOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-xl max-w-md w-full">
            <h3 className="text-xl font-semibold mb-4 dark:text-white">API 密钥设置</h3>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  OpenAI API 密钥
                </label>
                <input
                  type="password"
                  value={openaiKey}
                  onChange={(e) => setOpenaiKey(e.target.value)}
                  placeholder="sk-..."
                  className="w-full p-2 border rounded dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  DeepSeek API 密钥
                </label>
                <input
                  type="password"
                  value={deepseekKey}
                  onChange={(e) => setDeepseekKey(e.target.value)}
                  placeholder="dsk？？？-..."
                  className="w-full p-2 border rounded dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                />
              </div>
            </div>

            <div className="mt-6 flex justify-end space-x-3">
              <button
                onClick={() => setIsSettingsOpen(false)}
                className="px-4 py-2 text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white"
              >
                取消
              </button>
              <button
                onClick={handleSaveKeys}
                className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
              >
                保存
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default App