import { FC } from 'react'
import { Github, ExternalLink } from 'lucide-react'
import { cn } from '../lib/utils'

interface HelpDialogProps {
  isOpen: boolean
  onClose: () => void
}

export const HelpDialog: FC<HelpDialogProps> = ({ isOpen, onClose }) => {
  const handleStarOnGitHub = () => {
    window.electron.ipcRenderer.send('open-external-link', 'https://github.com/onebird-studio/onebird-chat')
  }

  const handleOpenDiscord = () => {
    window.electron.ipcRenderer.send('open-external-link', 'https://discord.gg/your-discord-link')
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-xl max-w-2xl w-full mx-4">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-2xl font-semibold dark:text-white">帮助中心</h2>
          <button
            onClick={onClose}
            className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div className="space-y-6">
          {/* 产品介绍 */}
          <section>
            <h3 className="text-xl font-medium mb-3 dark:text-white">关于 OneBird Chat</h3>
            <p className="text-gray-600 dark:text-gray-300 leading-relaxed">
              OneBird Chat 是一个强大的 AI 聊天应用，支持多种大语言模型，包括 OpenAI、DeepSeek 和 Ollama。
              它提供了直观的用户界面、主题自定义、字体设置等功能，让您可以轻松地与 AI 进行对话。
            </p>
          </section>

          {/* 功能特点 */}
          <section>
            <h3 className="text-xl font-medium mb-3 dark:text-white">主要特点</h3>
            <ul className="list-disc list-inside space-y-2 text-gray-600 dark:text-gray-300">
              <li>支持多种大语言模型</li>
              <li>深色/浅色主题切换</li>
              <li>自定义字体和大小</li>
              <li>聊天历史记录管理</li>
              <li>AI 思考过程可视化</li>
              <li>自动生成对话标题</li>
            </ul>
          </section>

          {/* 社区链接 */}
          <section className="flex flex-col sm:flex-row gap-4">
            <button
              onClick={handleStarOnGitHub}
              className={cn(
                "flex items-center justify-center gap-2 px-4 py-2 rounded-lg",
                "bg-gray-900 text-white hover:bg-gray-800",
                "dark:bg-gray-700 dark:hover:bg-gray-600",
                "transition-colors"
              )}
            >
              <Github className="w-5 h-5" />
              在 GitHub 上加星
            </button>
            <button
              onClick={handleOpenDiscord}
              className={cn(
                "flex items-center justify-center gap-2 px-4 py-2 rounded-lg",
                "bg-[#5865F2] text-white hover:bg-[#4752C4]",
                "transition-colors"
              )}
            >
              <ExternalLink className="w-5 h-5" />
              加入 Discord 社区
            </button>
          </section>
        </div>
      </div>
    </div>
  )
} 