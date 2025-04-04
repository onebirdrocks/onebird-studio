import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { PanelLeft, PanelRight, Settings, MessageSquare, Sun, Moon } from 'lucide-react'
import { useChatLLM } from './hooks/useChatLLMStream'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import remarkMath from 'remark-math'
import rehypeKatex from 'rehype-katex'
import rehypeRaw from 'rehype-raw'
import mermaid from 'mermaid'
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter'
import { oneDark } from 'react-syntax-highlighter/dist/esm/styles/prism'
import { AnimatePresence, motion as m } from 'framer-motion'

import 'katex/dist/katex.min.css'

// 首先定义 Tooltip 的位置类型
type TooltipPosition = 'top' | 'bottom';

// 修改 Tooltip 组件
const Tooltip = ({ text, position = 'top' }: { text: string; position?: TooltipPosition }) => (
  <m.div
    className={`absolute ${
      position === 'top'
        ? 'bottom-full mb-2' 
        : 'top-full mt-2'
    } left-1/2 -translate-x-1/2 w-max text-sm bg-yellow-400 text-gray-900 px-2 py-1 rounded shadow-lg z-10`}
    initial={{ opacity: 0, y: position === 'top' ? 5 : -5 }}
    animate={{ opacity: 1, y: 0 }}
    exit={{ opacity: 0, y: position === 'top' ? 5 : -5 }}
    transition={{ duration: 0.2 }}
  >
    {text}
  </m.div>
);

export default function Chat() {
  const [sidebarOpen, setSidebarOpen] = useState(true)
  const [input, setInput] = useState('')
  const [hovered, setHovered] = useState<string | null>(null)
  const [isDarkMode, setIsDarkMode] = useState(true)
  const { messages, isLoading, sendMessage } = useChatLLM()
  const [tooltipPositions, setTooltipPositions] = useState<Record<string, TooltipPosition>>({});

  const handleCopy = (text: string) => {
    navigator.clipboard.writeText(text)
  }

  useEffect(() => {
    const root = document.documentElement
    root.classList.toggle('dark', isDarkMode)
  }, [isDarkMode])

  // 添加位置检测函数
  const handleMouseEnter = (label: string, event: React.MouseEvent<HTMLDivElement>) => {
    const rect = event.currentTarget.getBoundingClientRect();
    const topSpace = rect.top;
    const position = topSpace < 40 ? 'bottom' : 'top';
    setTooltipPositions(prev => ({ ...prev, [label]: position }));
    setHovered(label);
  };

  return (
    <div className={`flex h-screen overflow-hidden font-sans text-base ${isDarkMode ? 'bg-gray-900 text-white' : 'bg-white text-gray-900'}`}>
      {/* Left Column - Menu */}
      <div className={`${isDarkMode ? 'bg-gray-800 border-gray-700' : 'bg-gray-100 border-gray-300'} w-16 flex flex-col items-center py-4 space-y-6 border-r relative`}>
        {[
          ['Settings', <Settings size={20} key="s" />, () => {}],
          ['Messages', <MessageSquare size={20} key="m" />, () => {}],
          ['Toggle Theme', isDarkMode ? <Sun key="sun" size={20} /> : <Moon key="moon" size={20} />, () => setIsDarkMode(!isDarkMode)]
        ].map(
          ([label, icon, onClick], idx) => (
            <div
              key={idx}
              className="relative"
              onMouseEnter={(e) => handleMouseEnter(label as string, e)}
              onMouseLeave={() => {
                setHovered(null);
                setTooltipPositions({});
              }}
            >
              <button
                className={`p-2 rounded ${
                  isDarkMode 
                    ? 'hover:bg-gray-700' 
                    : 'hover:bg-gray-200'
                }`}
                onClick={onClick as () => void}
              >
                {icon}
              </button>
              <AnimatePresence>
                {hovered === label && (
                  <Tooltip 
                    text={label as string} 
                    position={tooltipPositions[label as string] || 'top'}
                  />
                )}
              </AnimatePresence>
            </div>
          )
        )}

        {!sidebarOpen && (
          <div
            className="relative mt-auto mb-4"
            onMouseEnter={() => setHovered('Expand')}
            onMouseLeave={() => setHovered(null)}
          >
            <button
              className="w-4 h-4 bg-yellow-400 rounded-full shadow-lg hover:scale-110 transition-transform"
              onClick={() => setSidebarOpen(true)}
            />
            <AnimatePresence>
              {hovered === 'Expand' && <Tooltip text="Click to expand sidebar" />}
            </AnimatePresence>
          </div>
        )}
      </div>

      {/* Middle Column - Sidebar */}
      <motion.div
        initial={{ width: 0, opacity: 0 }}
        animate={{ width: sidebarOpen ? 256 : 0, opacity: sidebarOpen ? 1 : 0 }}
        transition={{ duration: 0.3 }}
        className={`${isDarkMode ? 'bg-gray-900 border-gray-700' : 'bg-gray-100 border-gray-300'} overflow-hidden border-r`}
      >
        <div className="flex justify-between items-center p-4 border-b">
          <h2 className="text-lg font-semibold">Topics</h2>
          <button
            className={`p-1 rounded ${
              isDarkMode 
                ? 'hover:bg-gray-700' 
                : 'hover:bg-gray-200'
            }`}
            onClick={() => setSidebarOpen(false)}
            title="Collapse Sidebar"
          >
            <PanelLeft size={20} />
          </button>
        </div>
        <div className="p-4 text-sm text-gray-400">Default Topic</div>
      </motion.div>

      {/* Right Column - Chat Panel */}
      <div className="flex-1 flex flex-col">
        <div className="h-12 px-4 flex items-center border-b text-sm">
          <span>deepseek-ai/DeepSeek-V3 | OneBirdStudio</span>
        </div>

        <div className="flex-1 p-4 overflow-y-auto space-y-4">
          {messages.map((msg, i) => (
            <div key={i} className={`text-base ${msg.role === 'user' ? 'text-blue-400' : 'text-green-400'} relative group`}>
              {msg.role === 'user' ? '🧑‍💻' : '🤖'}
              <ReactMarkdown
                className="prose max-w-none dark:prose-invert"
                remarkPlugins={[remarkGfm, remarkMath]}
                rehypePlugins={[rehypeKatex, rehypeRaw]}
                components={{
                  code({ node, inline, className, children, ...props }) {
                    const match = /language-(\w+)/.exec(className || '')
                    if (match && match[1] === 'mermaid') {
                      try {
                        const id = `mermaid-${i}`
                        setTimeout(() => {
                          mermaid.initialize({ startOnLoad: false })
                          mermaid.render(id, String(children), (svgCode) => {
                            const el = document.getElementById(id)
                            if (el) el.innerHTML = svgCode
                          })
                        }, 0)
                        return <div id={id} className="mermaid" />
                      } catch (err) {
                        return <pre>{String(children)}</pre>
                      }
                    }
                    return !inline && match ? (
                      <SyntaxHighlighter
                        style={oneDark}
                        language={match[1]}
                        PreTag="div"
                        {...props}
                      >
                        {String(children).replace(/\n$/, '')}
                      </SyntaxHighlighter>
                    ) : (
                      <code className={className} {...props}>
                        {children}
                      </code>
                    )
                  }
                }}
              >
                {msg.content}
              </ReactMarkdown>
              {msg.role === 'assistant' && (
                <button
                  onClick={() => handleCopy(msg.content)}
                  className="absolute top-0 right-0 text-sm opacity-0 group-hover:opacity-100 text-yellow-300 hover:underline"
                >
                  📋 复制
                </button>
              )}
            </div>
          ))}

          {isLoading && (
            <div className="animate-pulse text-base text-gray-500">AI 正在思考中...</div>
          )}
        </div>

        {/* Input */}
        <div className="p-4 border-t">
          <div className="flex items-center gap-2">
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && input.trim()) {
                  sendMessage(input)
                  setInput('')
                }
              }}
              className={`flex-1 px-4 py-2 rounded-lg text-base focus:outline-none ${
                isDarkMode 
                  ? 'bg-gray-800 text-white' 
                  : 'bg-gray-100 text-gray-900 border border-gray-300'
              }`}
              placeholder="Type your message here..."
            />
          </div>
        </div>
      </div>
    </div>
  )
}