import { useState } from 'react'
import { PanelLeft, Settings, MessageSquare } from 'lucide-react'

export default function Chat() {
  const [sidebarOpen, setSidebarOpen] = useState(true)

  return (
    <div className="flex h-screen bg-gray-900 text-white font-sans">
      {/* Left Column - Menu */}
      <div className="w-16 bg-gray-800 flex flex-col items-center py-4 space-y-6 border-r border-gray-700">
        <button className="p-2 rounded hover:bg-gray-700">
          <Settings size={20} />
        </button>
        <button className="p-2 rounded hover:bg-gray-700">
          <MessageSquare size={20} />
        </button>
      </div>

      {/* Middle Column - Sidebar */}
      <div className={`transition-all duration-300 ${sidebarOpen ? 'w-64' : 'w-0'} bg-gray-850 overflow-hidden border-r border-gray-700`}> 
        <div className="flex justify-between items-center p-4 border-b border-gray-700">
          <h2 className="text-lg font-semibold">Topics</h2>
          <button onClick={() => setSidebarOpen(false)} className="p-1 hover:bg-gray-700 rounded">
            <PanelLeft size={20} />
          </button>
        </div>
        <div className="p-4 text-sm text-gray-400">Default Topic</div>
      </div>

      {/* Right Column - Chat Panel */}
      <div className="flex-1 flex flex-col">
        {/* Chat Header */}
        <div className="h-12 px-4 flex items-center border-b border-gray-700 bg-gray-850 text-sm">
          <span>deepseek-ai/DeepSeek-V3 | OneBirdStudio</span>
        </div>

        {/* Chat Content */}
        <div className="flex-1 p-4 overflow-y-auto space-y-4">
          <div className="text-sm text-gray-300">
            <div className="bg-gray-800 p-3 rounded-md">
              <pre className="text-red-400 whitespace-pre-wrap">
{`{
  "message": "401 \"Invalid token\"",
  "status": 401,
  "error": "Invalid token"
}`}
              </pre>
              <div className="text-xs text-red-500 mt-2">
                Authentication failed. Please check if your API key is correct
              </div>
            </div>
          </div>
        </div>

        {/* Chat Input */}
        <div className="p-4 border-t border-gray-700 bg-gray-850">
          <div className="flex items-center gap-2">
            <input
              type="text"
              className="flex-1 bg-gray-800 text-white px-4 py-2 rounded-lg text-sm focus:outline-none"
              placeholder="Type your message here..."
            />
            <div className="flex items-center gap-2 text-gray-400">
              <button className="hover:text-yellow-400">🔍</button>
              <button className="hover:text-yellow-400">📎</button>
              <button className="hover:text-yellow-400">⚙️</button>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
