import { useState } from 'react'
import { motion } from 'framer-motion'
import { PanelLeft, PanelRight, Settings, MessageSquare } from 'lucide-react'

export default function Chat() {
  const [sidebarOpen, setSidebarOpen] = useState(true)

  return (
    <div className="flex h-screen overflow-hidden bg-gray-900 text-white font-sans">
      {/* Left Column - Menu */}
      <div className="w-16 bg-gray-800 flex flex-col items-center py-4 space-y-6 border-r border-gray-700 relative">
        <div className="relative group">
          <button className="p-2 rounded hover:bg-gray-700 transition-transform duration-200 hover:scale-110">
            <Settings size={20} />
          </button>
          <div className="absolute left-full ml-2 top-1/2 -translate-y-1/2 whitespace-nowrap bg-black text-white text-xs px-2 py-1 rounded opacity-0 group-hover:opacity-100 transition-opacity">
            Settings
          </div>
        </div>
        <div className="relative group">
          <button className="p-2 rounded hover:bg-gray-700 transition-transform duration-200 hover:scale-110">
            <MessageSquare size={20} />
          </button>
          <div className="absolute left-full ml-2 top-1/2 -translate-y-1/2 whitespace-nowrap bg-black text-white text-xs px-2 py-1 rounded opacity-0 group-hover:opacity-100 transition-opacity">
            Messages
          </div>
        </div>
        {!sidebarOpen && (
          <div className="relative group mt-auto mb-2">
            <button
              onClick={() => setSidebarOpen(true)}
              className="p-2 rounded hover:bg-gray-700 transition-transform duration-200 hover:scale-110"
            >
              <PanelRight size={20} />
            </button>
            <div className="absolute left-full ml-2 top-1/2 -translate-y-1/2 whitespace-nowrap bg-black text-white text-xs px-2 py-1 rounded opacity-0 group-hover:opacity-100 transition-opacity">
              Open Sidebar
            </div>
          </div>
        )}
        {!sidebarOpen && (
          <div className="absolute bottom-4 w-full flex justify-center">
            <div className="relative group">
              <div
                className="w-4 h-4 bg-yellow-400 rounded-full animate-pulse cursor-pointer"
                onClick={() => setSidebarOpen(true)}
              />
              <div className="absolute bottom-full mb-2 text-xs text-white bg-black px-2 py-1 rounded opacity-0 group-hover:opacity-100 transition-opacity">
                Click to expand sidebar
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Middle Column - Sidebar */}
      <motion.div
        initial={{ width: 0, opacity: 0 }}
        animate={{ width: sidebarOpen ? 256 : 0, opacity: sidebarOpen ? 1 : 0 }}
        transition={{ duration: 0.4 }}
        className="bg-gray-900 overflow-hidden border-r border-gray-700"
      >
        <div className="flex justify-between items-center p-4 border-b border-gray-700">
          <h2 className="text-lg font-semibold">Topics</h2>
          <div className="relative group">
            <button
              onClick={() => setSidebarOpen(false)}
              className="p-1 hover:bg-gray-700 rounded transition-transform duration-200 hover:scale-110"
            >
              <PanelLeft size={20} />
            </button>
            <div className="absolute right-full mr-2 top-1/2 -translate-y-1/2 whitespace-nowrap bg-black text-white text-xs px-2 py-1 rounded opacity-0 group-hover:opacity-100 transition-opacity">
              Close Sidebar
            </div>
          </div>
        </div>
        <div className="p-4 text-sm text-gray-400">Default Topic</div>
      </motion.div>

      {/* Right Column - Chat Panel */}
      <div className="flex-1 flex flex-col">
        <motion.div
          initial={{ opacity: 0, y: -8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3 }}
          className="h-12 px-4 flex items-center border-b border-gray-700 bg-gray-900 text-sm"
        >
          <span>deepseek-ai/DeepSeek-V3 | OneBirdStudio</span>
        </motion.div>

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

        <div className="p-4 border-t border-gray-700 bg-gray-900">
          <div className="flex items-center gap-2">
            <input
              type="text"
              className="flex-1 bg-gray-800 text-white px-4 py-2 rounded-lg text-sm focus:outline-none"
              placeholder="Type your message here..."
            />
            <div className="flex items-center gap-2 text-gray-400">
              <div className="relative group">
                <button className="hover:text-yellow-400 transition-transform duration-200 hover:scale-110">🔍</button>
                <div className="absolute bottom-full mb-1 left-1/2 -translate-x-1/2 bg-black text-white text-xs px-2 py-1 rounded opacity-0 group-hover:opacity-100 transition-opacity">
                  Search
                </div>
              </div>
              <div className="relative group">
                <button className="hover:text-yellow-400 transition-transform duration-200 hover:scale-110">📎</button>
                <div className="absolute bottom-full mb-1 left-1/2 -translate-x-1/2 bg-black text-white text-xs px-2 py-1 rounded opacity-0 group-hover:opacity-100 transition-opacity">
                  Attach File
                </div>
              </div>
              <div className="relative group">
                <button className="hover:text-yellow-400 transition-transform duration-200 hover:scale-110">⚙️</button>
                <div className="absolute bottom-full mb-1 left-1/2 -translate-x-1/2 bg-black text-white text-xs px-2 py-1 rounded opacity-0 group-hover:opacity-100 transition-opacity">
                  More Settings
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
