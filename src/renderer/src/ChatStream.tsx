import { useState, useEffect, ReactNode, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { PanelLeft, Settings, MessageSquare, Sun, Moon, Send, ChevronDown } from 'lucide-react'
import { useChatLLMStream } from './hooks/useChatLLMStream'
import { useModelSelection } from './hooks/useModelSelection'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import remarkMath from 'remark-math'
import rehypeKatex from 'rehype-katex'
import rehypeRaw from 'rehype-raw'
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter'
import { oneDark } from 'react-syntax-highlighter/dist/esm/styles/prism'
import type { Pluggable } from 'unified'

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

const remarkPlugins = [remarkGfm, remarkMath] as any[]
const rehypePlugins = [rehypeKatex, rehypeRaw] as any[]

export default function ChatStream() {
  const [sidebarOpen, setSidebarOpen] = useState(true)
  const [input, setInput] = useState('')
  const [hovered, setHovered] = useState<string | null>(null)
  const [isDarkMode, setIsDarkMode] = useState(true)
  const [streamingMessage, setStreamingMessage] = useState('')
  const [isThinking, setIsThinking] = useState(false)
  const [showModelSelect, setShowModelSelect] = useState(false)
  const [showSettings, setShowSettings] = useState(false)
  const { messages, isLoading, sendMessage, isServiceAvailable, isModelAvailable } = useChatLLMStream()
  const { 
    selectedModel, 
    setSelectedModel, 
    availableModels, 
    openAIKey, 
    updateOpenAIKey,
    isLoadingModels,
    error: modelError 
  } = useModelSelection()
  const [tooltipPositions, setTooltipPositions] = useState<Record<string, TooltipPosition>>({});
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const modelSelectRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, streamingMessage]);

  useEffect(() => {
    const root = document.documentElement;
    root.classList.toggle('dark', isDarkMode);
  }, [isDarkMode]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (modelSelectRef.current && !modelSelectRef.current.contains(event.target as Node)) {
        setShowModelSelect(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  const handleCopy = (text: string) => {
    navigator.clipboard.writeText(text);
  };

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
        thinkingContent = '';
        token = token.replace('<think>', '');
        setIsThinking(true);
      } else if (token.includes('</think>')) {
        inThinkingMode = false;
        token = token.replace('</think>', '');
        setIsThinking(false);
      }
      
      if (inThinkingMode) {
        thinkingContent += token;
        currentContent = `<think>${thinkingContent}</think>${normalContent}`;
      } else {
        normalContent += token;
        currentContent = thinkingContent ? `<think>${thinkingContent}</think>${normalContent}` : normalContent;
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
    const parts = content.split(/(<think>[\s\S]*?<\/think>)/g).map((part, index) => {
      if (part.startsWith('<think>')) {
        const cleanContent = part
          .replace(/<think>|<\/think>/g, '')
          .trim();
        
        return cleanContent ? (
          <div key={index} className="bg-purple-100 dark:bg-purple-900/30 p-4 rounded-lg my-2 text-purple-800 dark:text-purple-200">
            <div className="font-bold mb-2">思考：</div>
            <ReactMarkdown
              className="prose max-w-none dark:prose-invert mt-1"
              remarkPlugins={remarkPlugins}
              rehypePlugins={rehypePlugins}
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
        ) : null;
      }
      
      return part ? (
        <ReactMarkdown
          key={index}
          className="prose max-w-none dark:prose-invert"
          remarkPlugins={remarkPlugins}
          rehypePlugins={rehypePlugins}
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
      ) : null;
    });

    return <div>{parts}</div>;
  };

  const menuItems: MenuItemProps[] = [
    { 
      label: 'Settings', 
      icon: <Settings size={20} />, 
      onClick: () => setShowSettings(!showSettings) 
    },
    { label: 'Messages', icon: <MessageSquare size={20} />, onClick: () => {} },
    { label: 'Toggle Theme', icon: isDarkMode ? <Sun size={20} /> : <Moon size={20} />, onClick: () => setIsDarkMode(!isDarkMode) }
  ];

  return (
    <div className={`flex h-screen overflow-hidden font-sans text-base ${isDarkMode ? 'dark bg-gray-900 text-white' : 'bg-white text-gray-900'}`}>
      {/* Left Column - Menu */}
      <div className={`w-16 flex-shrink-0 ${isDarkMode ? 'bg-gray-900 border-gray-700' : 'bg-gray-100 border-gray-300'} border-r flex flex-col items-center py-4`}>
        {menuItems.map(({ label, icon, onClick }) => (
          <div
            key={label}
            className="relative"
            onMouseEnter={(e) => handleMouseEnter(label, e)}
            onMouseLeave={() => setHovered(null)}
          >
            <button
              className={`p-3 rounded-lg mb-2 ${
                isDarkMode
                  ? 'hover:bg-gray-800'
                  : 'hover:bg-gray-200'
              }`}
              onClick={onClick}
            >
              {icon}
            </button>
            <AnimatePresence>
              {hovered === label && (
                <Tooltip
                  text={label}
                  position={tooltipPositions[label]}
                />
              )}
            </AnimatePresence>
          </div>
        ))}
      </div>

      {/* Middle Column - Sidebar */}
      <motion.div
        initial={{ width: 0, opacity: 0 }}
        animate={{ width: sidebarOpen ? 256 : 0, opacity: sidebarOpen ? 1 : 0 }}
        transition={{ duration: 0.3 }}
        className={`${isDarkMode ? 'bg-gray-900 border-gray-700' : 'bg-gray-100 border-gray-300'} overflow-hidden border-r`}
      >
        <div className="flex justify-between items-center p-4 border-b">
          <h2 className="text-lg font-semibold">设置</h2>
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
        <div className="p-4">
          <div className="mb-4">
            <label className="block text-sm font-medium mb-2">OpenAI API Key</label>
            <input
              type="password"
              value={openAIKey}
              onChange={(e) => updateOpenAIKey(e.target.value)}
              onKeyPress={handleKeyPress}
              className={`w-full p-2 rounded border ${
                isDarkMode
                  ? 'bg-gray-800 border-gray-700'
                  : 'bg-white border-gray-300'
              }`}
              placeholder="sk-..."
            />
            {isLoadingModels && (
              <div className="mt-2 text-sm text-blue-500">
                正在加载模型列表...
              </div>
            )}
            {modelError && (
              <div className="mt-2 text-sm text-red-500">
                {modelError}
              </div>
            )}
          </div>
        </div>
      </motion.div>

      {/* Right Column - Chat Panel */}
      <div className="flex-1 flex flex-col">
        <div className="h-12 px-4 flex items-center border-b text-sm justify-between">
          <div className="relative" ref={modelSelectRef}>
            <button
              onClick={() => setShowModelSelect(!showModelSelect)}
              className={`flex items-center space-x-2 px-3 py-1 rounded ${
                isDarkMode ? 'hover:bg-gray-800' : 'hover:bg-gray-100'
              }`}
            >
              <span>{selectedModel.name}</span>
              <ChevronDown size={16} />
            </button>
            
            {showModelSelect && (
              <div className={`absolute top-full left-0 mt-1 w-64 rounded-lg shadow-lg ${
                isDarkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'
              } border overflow-hidden z-10`}>
                <div className="max-h-64 overflow-y-auto">
                  {availableModels.map((model) => (
                    <button
                      key={model.id}
                      onClick={() => {
                        setSelectedModel(model);
                        setShowModelSelect(false);
                      }}
                      className={`w-full text-left px-4 py-2 ${
                        isDarkMode
                          ? 'hover:bg-gray-700'
                          : 'hover:bg-gray-100'
                      } ${
                        selectedModel.id === model.id
                          ? isDarkMode
                            ? 'bg-gray-700'
                            : 'bg-gray-100'
                          : ''
                      }`}
                    >
                      <div className="font-medium">{model.name}</div>
                      <div className="text-xs text-gray-500">
                        {model.provider === 'ollama' ? 'Ollama' : 'OpenAI'}
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>
          
          <div className="flex items-center gap-2">
            {selectedModel.provider === 'ollama' ? (
              !isServiceAvailable ? (
                <div className="flex items-center text-red-500 text-sm">
                  <span className="w-2 h-2 bg-red-500 rounded-full mr-2"></span>
                  Ollama 服务未运行
                </div>
              ) : !isModelAvailable ? (
                <div className="flex items-center text-yellow-500 text-sm">
                  <span className="w-2 h-2 bg-yellow-500 rounded-full mr-2"></span>
                  未找到 {selectedModel.name} 模型
                </div>
              ) : (
                <div className="flex items-center text-green-500 text-sm">
                  <span className="w-2 h-2 bg-green-500 rounded-full mr-2"></span>
                  服务正常
                </div>
              )
            ) : !openAIKey ? (
              <div className="flex items-center text-yellow-500 text-sm">
                <span className="w-2 h-2 bg-yellow-500 rounded-full mr-2"></span>
                请设置 OpenAI API Key
              </div>
            ) : (
              <div className="flex items-center text-green-500 text-sm">
                <span className="w-2 h-2 bg-green-500 rounded-full mr-2"></span>
                OpenAI 就绪
              </div>
            )}
          </div>
        </div>

        {/* Messages */}
        <div className="flex-1 overflow-y-auto p-4">
          {messages.slice(0, -1).map((message, index) => (
            <div
              key={index}
              className={`mb-4 ${
                message.role === 'assistant'
                  ? 'bg-gray-100 dark:bg-gray-800 rounded-lg p-4'
                  : ''
              }`}
            >
              <div className="font-medium mb-2">
                {message.role === 'assistant' ? '助手' : '用户'}
              </div>
              {renderMarkdown(message.content)}
            </div>
          ))}
          {messages.length > 0 && messages[messages.length - 1].role === 'assistant' ? (
            <div className="mb-4 bg-gray-100 dark:bg-gray-800 rounded-lg p-4">
              <div className="font-medium mb-2">助手</div>
              {renderMarkdown(streamingMessage || messages[messages.length - 1].content)}
            </div>
          ) : messages.length > 0 ? (
            <>
              <div className="mb-4">
                <div className="font-medium mb-2">用户</div>
                {renderMarkdown(messages[messages.length - 1].content)}
              </div>
              {streamingMessage && (
                <div className="mb-4 bg-gray-100 dark:bg-gray-800 rounded-lg p-4">
                  <div className="font-medium mb-2">助手</div>
                  {renderMarkdown(streamingMessage)}
                </div>
              )}
            </>
          ) : null}
          <div ref={messagesEndRef} />
        </div>

        {/* Input */}
        <div className="p-4 border-t">
          <form onSubmit={handleSubmit} className="flex gap-2">
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyPress={handleKeyPress}
              placeholder="输入消息..."
              className={`flex-1 p-2 rounded-lg border ${
                isDarkMode
                  ? 'bg-gray-800 border-gray-700 text-white'
                  : 'bg-white border-gray-300 text-gray-900'
              }`}
              disabled={!isServiceAvailable || !isModelAvailable}
            />
            <button
              type="submit"
              disabled={!input.trim() || isLoading || !isServiceAvailable || !isModelAvailable}
              className={`px-4 py-2 rounded-lg ${
                !input.trim() || isLoading || !isServiceAvailable || !isModelAvailable
                  ? 'bg-gray-300 dark:bg-gray-700 cursor-not-allowed'
                  : 'bg-blue-500 hover:bg-blue-600 text-white'
              }`}
            >
              <Send size={20} />
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}