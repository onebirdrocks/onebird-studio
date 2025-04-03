import { useState } from 'react'
import { PanelLeft, Settings, MessageSquare } from 'lucide-react'

export default function Chat() {
  const [sidebarOpen, setSidebarOpen] = useState(true)

  return (
    <div className="flex h-screen bg-gray-900 text-white font-sans antialiased">
      {/* 左侧工具栏 */}
      <div className="flex-shrink-0 w-16 bg-gray-800 border-r border-gray-700">
        <div className="flex flex-col items-center py-4 space-y-4">
          <button className="p-2 rounded-lg hover:bg-gray-700 transition-colors">
            <Settings className="w-6 h-6" />
          </button>
          <button className="p-2 rounded-lg hover:bg-gray-700 transition-colors">
            <MessageSquare className="w-6 h-6" />
          </button>
        </div>
      </div>

      {/* 中间会话列表 */}
      <div className={`flex-shrink-0 ${sidebarOpen ? 'w-64' : 'w-0'} bg-gray-800 border-r border-gray-700 transition-all duration-300 overflow-hidden`}>
        <div className="flex flex-col h-full">
          <div className="flex items-center justify-between p-4 border-b border-gray-700">
            <h2 className="text-lg font-semibold">Topics</h2>
            <button 
              onClick={() => setSidebarOpen(false)}
              className="p-2 rounded-lg hover:bg-gray-700 transition-colors"
            >
              <PanelLeft className="w-5 h-5" />
            </button>
          </div>
          <div className="flex-1 overflow-y-auto">
            <div className="p-4">
              <div className="p-3 rounded-lg bg-gray-700 hover:bg-gray-600 cursor-pointer transition-colors">
                <div className="font-medium">Default Topic</div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* 右侧聊天区域 */}
      <div className="flex-1 flex flex-col min-w-0">
        <div className="flex-shrink-0 h-14 border-b border-gray-700 flex items-center px-4">
          <span className="text-sm text-gray-300">deepseek-ai/DeepSeek-V3 | OneBirdStudio</span>
        </div>

        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          <div className="bg-gray-800 rounded-lg p-4">
            <pre className="text-red-400 whitespace-pre-wrap text-sm">
{`{
  "message": "401 "Invalid token"",
  "status": 401,
  "error": "Invalid token"
}`}
            </pre>
            <p className="mt-2 text-sm text-red-400">
              Authentication failed. Please check if your API key is correct
            </p>
          </div>
        </div>

        <div className="flex-shrink-0 border-t border-gray-700 p-4">
          <div className="flex items-center gap-3">
            <input
              type="text"
              placeholder="Type your message here..."
              className="flex-1 bg-gray-800 text-white rounded-lg px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            <div className="flex items-center gap-2">
              <button className="p-2 hover:bg-gray-800 rounded-lg transition-colors">
                🔍
              </button>
              <button className="p-2 hover:bg-gray-800 rounded-lg transition-colors">
                📎
              </button>
              <button className="p-2 hover:bg-gray-800 rounded-lg transition-colors">
                ⚙️
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
