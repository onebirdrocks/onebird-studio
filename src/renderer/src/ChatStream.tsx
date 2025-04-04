import { useState, useEffect, ReactNode, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { PanelLeft, Settings, MessageSquare, Sun, Moon, Send } from 'lucide-react'
import { useChatLLMStream } from './hooks/useChatLLMStream'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import remarkMath from 'remark-math'
import rehypeKatex from 'rehype-katex'
import rehypeRaw from 'rehype-raw'
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter'
import { oneDark } from 'react-syntax-highlighter/dist/esm/styles/prism'

import 'katex/dist/katex.min.css'

type TooltipPosition = 'top' | 'bottom';

interface TooltipProps {
  text: string;
  position?: TooltipPosition;
}

interface MenuItemProps {
  label: string;
  icon: ReactNode;
  onClick: () => void;
}

function Tooltip({ text, position = 'top' }: TooltipProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: position === 'top' ? 10 : -10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: position === 'top' ? 10 : -10 }}
      className={`absolute ${
        position === 'top' ? 'bottom-full mb-2' : 'top-full mt-2'
      } left-1/2 transform -translate-x-1/2 px-2 py-1 bg-gray-800 text-white text-xs rounded whitespace-nowrap`}
    >
      {text}
    </motion.div>
  );
}

export default function ChatStream() {
  const [sidebarOpen, setSidebarOpen] = useState(true)
  const [input, setInput] = useState('')
  const [hovered, setHovered] = useState<string | null>(null)
  const [isDarkMode, setIsDarkMode] = useState(true)
  const [streamingMessage, setStreamingMessage] = useState('')
  const [isThinking, setIsThinking] = useState(false)
  const { messages, isLoading, sendMessage, isServiceAvailable, isModelAvailable } = useChatLLMStream()
  const [tooltipPositions, setTooltipPositions] = useState<Record<string, TooltipPosition>>({});
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  };

  // 当消息列表更新时滚动
  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  // 当流式消息更新时滚动
  useEffect(() => {
    scrollToBottom();
  }, [streamingMessage]);

  const menuItems: MenuItemProps[] = [
    { label: 'Settings', icon: <Settings size={20} />, onClick: () => {} },
    { label: 'Messages', icon: <MessageSquare size={20} />, onClick: () => {} },
    { label: 'Toggle Theme', icon: isDarkMode ? <Sun size={20} /> : <Moon size={20} />, onClick: () => setIsDarkMode(!isDarkMode) }
  ];

  const handleCopy = (text: string) => {
    navigator.clipboard.writeText(text)
  }

  useEffect(() => {
    const root = document.documentElement
    root.classList.toggle('dark', isDarkMode)
  }, [isDarkMode])

  const handleMouseEnter = (label: string, event: React.MouseEvent<HTMLDivElement>) => {
    const rect = event.currentTarget.getBoundingClientRect();
    const topSpace = rect.top;
    const position = topSpace < 40 ? 'bottom' : 'top';
    setTooltipPositions(prev => ({ ...prev, [label]: position }));
    setHovered(label);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || isLoading) return;

    const userInput = input;
    setInput('');
    setStreamingMessage('');
    setIsThinking(false);
    let currentContent = '';
    let thinkingContent = '';
    let normalContent = '';
    let inThinkingMode = false;

    await sendMessage(userInput, (token) => {
      if (token.includes('<think>')) {
        inThinkingMode = true;
        token = token.replace('<think>', '思考：');
        setIsThinking(true);
      } else if (token.includes('</think>')) {
        inThinkingMode = false;
        token = token.replace('</think>', '');
      }
      
      if (inThinkingMode) {
        thinkingContent += token;
      } else {
        normalContent += token;
      }
      
      currentContent = normalContent;
      if (thinkingContent) {
        currentContent = `<think>${thinkingContent}</think>${normalContent}`;
      }
      
      setStreamingMessage(currentContent);
    });
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit(e as unknown as React.FormEvent);
    }
  };

  const renderMarkdown = (content: string) => {
    // 处理已完成的消息中的 <think> 标签
    if (!isLoading) {
      const parts = content.split(/(<think>[\s\S]*?<\/think>)/g).map((part, index) => {
        if (part.startsWith('<think>')) {
          const cleanContent = part
            .replace('<think>', '思考：')
            .replace('</think>', '');
          
          return (
            <div key={index} className="bg-purple-100 dark:bg-purple-900/30 p-4 rounded-lg my-2 text-purple-800 dark:text-purple-200">
              <ReactMarkdown
                className="prose max-w-none dark:prose-invert mt-1"
                components={{
                  code({ className, children, ...props }) {
                    const match = /language-(\w+)/.exec(className || '');
                    return match ? (
                      <div className="relative group">
                        <SyntaxHighlighter
                          style={oneDark}
                          language={match[1]}
                          PreTag="div"
                          {...props}
                        >
                          {String(children).replace(/\n$/, '')}
                        </SyntaxHighlighter>
                        <button
                          onClick={() => handleCopy(String(children))}
                          className="absolute top-2 right-2 p-2 rounded bg-gray-700 opacity-0 group-hover:opacity-100 transition-opacity"
                        >
                          复制
                        </button>
                      </div>
                    ) : (
                      <code className={className} {...props}>
                        {children}
                      </code>
                    );
                  },
                }}
              >
                {cleanContent}
              </ReactMarkdown>
            </div>
          );
        } else if (part.trim()) {
          return (
            <ReactMarkdown
              key={index}
              className="prose max-w-none dark:prose-invert mt-1"
              components={{
                code({ className, children, ...props }) {
                  const match = /language-(\w+)/.exec(className || '');
                  return match ? (
                    <div className="relative group">
                      <SyntaxHighlighter
                        style={oneDark}
                        language={match[1]}
                        PreTag="div"
                        {...props}
                      >
                        {String(children).replace(/\n$/, '')}
                      </SyntaxHighlighter>
                      <button
                        onClick={() => handleCopy(String(children))}
                        className="absolute top-2 right-2 p-2 rounded bg-gray-700 opacity-0 group-hover:opacity-100 transition-opacity"
                      >
                        复制
                      </button>
                    </div>
                  ) : (
                    <code className={className} {...props}>
                      {children}
                    </code>
                  );
                },
              }}
            >
              {part}
            </ReactMarkdown>
          );
        }
        return null;
      }).filter(Boolean);

      return <>{parts}</>;
    }

    // 处理流式消息
    const parts = content.split(/(<think>[\s\S]*?<\/think>)/g).map((part, index) => {
      if (part.startsWith('<think>')) {
        const cleanContent = part
          .replace('<think>', '思考：')
          .replace('</think>', '');
        
        return (
          <div key={index} className="bg-purple-100 dark:bg-purple-900/30 p-4 rounded-lg my-2 text-purple-800 dark:text-purple-200">
            <ReactMarkdown
              className="prose max-w-none dark:prose-invert mt-1"
              components={{
                code({ className, children, ...props }) {
                  const match = /language-(\w+)/.exec(className || '');
                  return match ? (
                    <div className="relative group">
                      <SyntaxHighlighter
                        style={oneDark}
                        language={match[1]}
                        PreTag="div"
                        {...props}
                      >
                        {String(children).replace(/\n$/, '')}
                      </SyntaxHighlighter>
                    </div>
                  ) : (
                    <code className={className} {...props}>
                      {children}
                    </code>
                  );
                },
              }}
            >
              {cleanContent}
            </ReactMarkdown>
          </div>
        );
      } else if (part.trim()) {
        return (
          <ReactMarkdown
            key={index}
            className="prose max-w-none dark:prose-invert mt-1"
            components={{
              code({ className, children, ...props }) {
                const match = /language-(\w+)/.exec(className || '');
                return match ? (
                  <div className="relative group">
                    <SyntaxHighlighter
                      style={oneDark}
                      language={match[1]}
                      PreTag="div"
                      {...props}
                    >
                      {String(children).replace(/\n$/, '')}
                    </SyntaxHighlighter>
                  </div>
                ) : (
                  <code className={className} {...props}>
                    {children}
                  </code>
                );
              },
            }}
          >
            {part}
          </ReactMarkdown>
        );
      }
      return null;
    }).filter(Boolean);

    return <>{parts}</>;
  };

  return (
    <div className={`flex h-screen overflow-hidden font-sans text-base ${isDarkMode ? 'bg-gray-900 text-white' : 'bg-white text-gray-900'}`}>
      {/* Left Column - Menu */}
      <div className={`${isDarkMode ? 'bg-gray-800 border-gray-700' : 'bg-gray-100 border-gray-300'} w-16 flex flex-col items-center py-4 space-y-6 border-r relative`}>
        {menuItems.map((item, idx) => (
          <div
            key={idx}
            className="relative"
            onMouseEnter={(e) => handleMouseEnter(item.label, e)}
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
              onClick={item.onClick}
            >
              {item.icon}
            </button>
            <AnimatePresence>
              {hovered === item.label && (
                <Tooltip 
                  text={item.label} 
                  position={tooltipPositions[item.label] || 'top'}
                />
              )}
            </AnimatePresence>
          </div>
        ))}

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
              {hovered === 'Expand' && <Tooltip text="展开侧边栏" />}
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
          <h2 className="text-lg font-semibold">主题</h2>
          <button
            className={`p-1 rounded ${
              isDarkMode 
                ? 'hover:bg-gray-700' 
                : 'hover:bg-gray-200'
            }`}
            onClick={() => setSidebarOpen(false)}
            title="收起侧边栏"
          >
            <PanelLeft size={20} />
          </button>
        </div>
        <div className="p-4 text-sm text-gray-400">默认主题</div>
      </motion.div>

      {/* Right Column - Chat Panel */}
      <div className="flex-1 flex flex-col">
        <div className="h-12 px-4 flex items-center border-b text-sm justify-between">
          <span>deepseek-r1:latest | OneBirdStudio</span>
          <div className="flex items-center gap-2">
            {!isServiceAvailable ? (
              <div className="flex items-center text-red-500 text-sm">
                <span className="w-2 h-2 bg-red-500 rounded-full mr-2"></span>
                Ollama 服务未运行
              </div>
            ) : !isModelAvailable ? (
              <div className="flex items-center text-yellow-500 text-sm">
                <span className="w-2 h-2 bg-yellow-500 rounded-full mr-2"></span>
                未找到 deepseek-r1:latest 模型
              </div>
            ) : (
              <div className="flex items-center text-green-500 text-sm">
                <span className="w-2 h-2 bg-green-500 rounded-full mr-2"></span>
                服务正常
              </div>
            )}
          </div>
        </div>

        <div className="flex-1 p-4 overflow-y-auto space-y-4">
          {!isServiceAvailable && (
            <div className="bg-red-500/10 border border-red-500/20 rounded-lg p-4 text-sm">
              <div className="font-semibold text-red-500 mb-1">⚠️ Ollama 服务未运行</div>
              <div className="text-red-400">
                请在终端运行以下命令启动服务：
                <code className="bg-red-500/20 px-2 py-1 rounded ml-2">ollama serve</code>
              </div>
            </div>
          )}
          {isServiceAvailable && !isModelAvailable && (
            <div className="bg-yellow-500/10 border border-yellow-500/20 rounded-lg p-4 text-sm">
              <div className="font-semibold text-yellow-500 mb-1">⚠️ 未找到 deepseek-r1:latest 模型</div>
              <div className="text-yellow-400">
                请在终端运行以下命令安装模型：
                <code className="bg-yellow-500/20 px-2 py-1 rounded ml-2">ollama pull deepseek-r1:latest</code>
              </div>
            </div>
          )}

          {messages.map((msg, i) => (
            <div key={i} className={`text-base ${msg.role === 'user' ? 'text-blue-400' : 'text-green-400'} relative group`}>
              {msg.role === 'user' ? '🧑‍💻' : '🤖'}
              {renderMarkdown(msg.content)}
            </div>
          ))}

          {isLoading && streamingMessage && (
            <div className="text-base text-green-400 relative group">
              🤖
              {renderMarkdown(streamingMessage)}
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>

        <form onSubmit={handleSubmit} className="p-4 border-t border-gray-200 dark:border-gray-700">
          <div className="flex items-center space-x-2">
            <textarea
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyPress={handleKeyPress}
              placeholder="输入消息..."
              className={`flex-1 p-2 rounded-lg border ${
                isDarkMode
                  ? 'bg-gray-800 text-white border-gray-700'
                  : 'bg-white text-gray-900 border-gray-300'
              } focus:outline-none focus:ring-2 focus:ring-blue-500`}
              rows={1}
              style={{ resize: 'none' }}
            />
            <button
              type="submit"
              disabled={isLoading || !input.trim()}
              className={`p-2 rounded-lg ${
                isLoading || !input.trim()
                  ? 'bg-gray-300 cursor-not-allowed'
                  : isDarkMode
                  ? 'bg-blue-600 hover:bg-blue-700'
                  : 'bg-blue-500 hover:bg-blue-600'
              } text-white`}
            >
              <Send size={20} />
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}