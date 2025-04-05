import { FC } from 'react'
import { Message } from '../types/chat'
import { ThinkingIcon } from './icons/ThinkingIcon'
import { useSettingStore } from '../stores/settingStore'
import { cn } from '../lib/utils'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import remarkMath from 'remark-math'
import rehypeKatex from 'rehype-katex'
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter'
import { oneDark } from 'react-syntax-highlighter/dist/esm/styles/prism'
import 'katex/dist/katex.min.css'
import { Components } from 'react-markdown'

interface MessageItemProps {
  message: Message
}

// 使用 any 类型来避免复杂的类型问题
const remarkPlugins = [remarkGfm, remarkMath] as any[]
const rehypePlugins = [rehypeKatex] as any[]

interface CodeProps {
  node?: any
  inline?: boolean
  className?: string
  children?: React.ReactNode
}

export const MessageItem: FC<MessageItemProps> = ({ message }) => {
  const { themeColor, fontSize, fontFamily } = useSettingStore()

  // 解码转义的 HTML 实体
  const decodeHtml = (html: string) => {
    const txt = document.createElement('textarea')
    txt.innerHTML = html
    return txt.value
  }

  // 获取字体相关的样式类
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

  // 获取主题相关的样式类
  const getThemeClasses = () => {
    const themes = {
      teal: {
        bg: 'bg-teal-50/80 dark:bg-teal-900/20',
        border: 'border-l-teal-400 dark:border-l-teal-500',
        text: 'text-teal-700 dark:text-teal-300',
        hover: 'hover:bg-teal-50 dark:hover:bg-teal-900/30',
      },
      sky: {
        bg: 'bg-sky-50/80 dark:bg-sky-900/20',
        border: 'border-l-sky-400 dark:border-l-sky-500',
        text: 'text-sky-700 dark:text-sky-300',
        hover: 'hover:bg-sky-50 dark:hover:bg-sky-900/30',
      },
      rose: {
        bg: 'bg-rose-50/80 dark:bg-rose-900/20',
        border: 'border-l-rose-400 dark:border-l-rose-500',
        text: 'text-rose-700 dark:text-rose-300',
        hover: 'hover:bg-rose-50 dark:hover:bg-rose-900/30',
      },
      purple: {
        bg: 'bg-purple-50/80 dark:bg-purple-900/20',
        border: 'border-l-purple-400 dark:border-l-purple-500',
        text: 'text-purple-700 dark:text-purple-300',
        hover: 'hover:bg-purple-50 dark:hover:bg-purple-900/30',
      },
    }
    return themes[themeColor]
  }

  const markdownComponents: Components = {
    code({ node, inline, className, children, ...props }: CodeProps) {
      const match = /language-(\w+)/.exec(className || '')
      return !inline && match ? (
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
            onClick={() => navigator.clipboard.writeText(String(children))}
            className="absolute top-2 right-2 p-2 rounded bg-gray-700/50 text-white opacity-0 group-hover:opacity-100 transition-opacity"
          >
            复制
          </button>
        </div>
      ) : (
        <code className={cn(
          "px-1.5 py-0.5 rounded",
          "bg-gray-100 dark:bg-gray-800",
          "text-gray-900 dark:text-gray-100",
          className
        )} {...props}>
          {children}
        </code>
      )
    }
  }

  const renderContent = (content: string) => {
    const decodedContent = decodeHtml(content)
    const themeClasses = getThemeClasses()
    
    const parts = decodedContent.split(/(<think>|<\/think>)/)
    
    return parts.map((part, index) => {
      if (part === '<think>' || part === '</think>') {
        return null
      }
      
      const isThinking = index > 0 && parts[index - 1] === '<think>'
      
      if (isThinking) {
        return (
          <div 
            key={index} 
            className={cn(
              "my-4 p-4 rounded-xl border-l-4 shadow-sm transition-colors",
              themeClasses.bg,
              themeClasses.border,
              themeClasses.hover
            )}
          >
            <div className={cn(
              "flex items-center gap-2 mb-3",
              themeClasses.text,
              "text-sm font-medium"
            )}>
              <ThinkingIcon className="w-4 h-4" />
              思考过程
            </div>
            <div className="pl-6">
              <ReactMarkdown
                className={cn(
                  "prose prose-sm max-w-none",
                  "dark:prose-invert",
                  "prose-p:my-1.5",
                  "prose-code:px-1 prose-code:py-0.5 prose-code:rounded",
                  "prose-code:bg-gray-100 dark:prose-code:bg-gray-800",
                  "prose-code:text-gray-900 dark:prose-code:text-gray-100",
                  "prose-pre:bg-gray-900",
                  "prose-pre:my-2"
                )}
                remarkPlugins={remarkPlugins}
                rehypePlugins={rehypePlugins}
                components={markdownComponents}
              >
                {part}
              </ReactMarkdown>
            </div>
          </div>
        )
      }
      
      return part ? (
        <ReactMarkdown
          key={index}
          className={cn(
            "prose prose-base max-w-none",
            "dark:prose-invert",
            "prose-p:my-3",
            "prose-code:px-1 prose-code:py-0.5 prose-code:rounded",
            "prose-code:bg-gray-100 dark:prose-code:bg-gray-800",
            "prose-code:text-gray-900 dark:prose-code:text-gray-100",
            "prose-pre:bg-gray-900",
            "prose-pre:my-4"
          )}
          remarkPlugins={remarkPlugins}
          rehypePlugins={rehypePlugins}
          components={markdownComponents}
        >
          {part}
        </ReactMarkdown>
      ) : null
    })
  }

  return (
    <div 
      className={cn(
        "p-4",
        message.role === 'assistant' ? 'bg-gray-50 dark:bg-slate-800/50' : '',
        getFontFamilyClass()
      )}
      style={{ fontSize: `${fontSize}px` }}
    >
      <div className="flex items-start gap-4">
        <div className="w-8 h-8 rounded-full bg-blue-500 flex items-center justify-center text-white shrink-0">
          {message.role === 'assistant' ? 'A' : 'U'}
        </div>
        <div className="flex-1 min-w-0 text-gray-900 dark:text-gray-100">
          {renderContent(message.content)}
        </div>
      </div>
    </div>
  )
} 