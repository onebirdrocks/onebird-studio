import React from 'react'
import { Message } from '../types/chat'
import { ThinkingIcon } from './icons/ThinkingIcon'
import { useSettingStore } from '../stores/settingStore'
import { cn } from '../lib/utils'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import remarkMath from 'remark-math'
import rehypeKatex from 'rehype-katex'
import rehypeRaw from 'rehype-raw'
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter'
import { oneDark } from 'react-syntax-highlighter/dist/esm/styles/prism'
import 'katex/dist/katex.min.css'
import type { Components } from 'react-markdown'

interface MessageItemProps {
  message: Message
  id?: string
}

interface CodeProps {
  node?: any
  inline?: boolean
  className?: string
  children?: React.ReactNode
}

export function MessageItem({ message, id }: MessageItemProps) {
  const { fontSize, fontFamily, themeColor } = useSettingStore();

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
    return themes[themeColor] || themes.sky
  }

  // 解析并渲染消息内容，处理思考过程
  const renderContent = (content: string) => {
    const parts = content.split(/(<think>|<\/think>)/);
    const themeClasses = getThemeClasses();
    
    return parts.map((part, index) => {
      if (part === '<think>' || part === '</think>') {
        return null;
      }

      const isThinking = index > 0 && parts[index - 1] === '<think>';
      
      if (isThinking) {
        return (
          <div 
            key={index}
            className={cn(
              "my-4 p-4 rounded-lg border-l-4",
              themeClasses.bg,
              themeClasses.border,
              themeClasses.hover
            )}
            style={{ fontSize: `${fontSize}px` }}
          >
            <div className={cn(
              "flex items-center gap-2 mb-2",
              themeClasses.text
            )}>
              <ThinkingIcon className="w-4 h-4" />
              <span style={{ fontSize: `${fontSize}px` }}>思考过程</span>
            </div>
            <div className="pl-6">
              <ReactMarkdown
                // @ts-ignore
                remarkPlugins={[remarkGfm, remarkMath]}
                // @ts-ignore
                rehypePlugins={[rehypeKatex, rehypeRaw]}
                components={components}
              >
                {part}
              </ReactMarkdown>
            </div>
          </div>
        );
      }

      return part ? (
        <ReactMarkdown
          key={index}
          // @ts-ignore
          remarkPlugins={[remarkGfm, remarkMath]}
          // @ts-ignore
          rehypePlugins={[rehypeKatex, rehypeRaw]}
          components={components}
        >
          {part}
        </ReactMarkdown>
      ) : null;
    });
  };

  const components: Components = {
    code({ className, children, ...props }: CodeProps) {
      const match = /language-(\w+)/.exec(className || '');
      const isInline = !match;
      return !isInline ? (
        <SyntaxHighlighter
          style={oneDark}
          language={match[1]}
          PreTag="div"
          customStyle={{ fontSize: `${fontSize}px` }}
          {...props}
        >
          {String(children).replace(/\n$/, '')}
        </SyntaxHighlighter>
      ) : (
        <code 
          className={className} 
          style={{ fontSize: `${fontSize}px` }}
          {...props}
        >
          {children}
        </code>
      );
    },
    p({ children }) {
      return (
        <p style={{ fontSize: `${fontSize}px`, lineHeight: '1.6' }}>
          {children}
        </p>
      );
    },
    h1({ children }) {
      return (
        <h1 style={{ fontSize: `${fontSize * 2}px`, lineHeight: '1.4' }}>
          {children}
        </h1>
      );
    },
    h2({ children }) {
      return (
        <h2 style={{ fontSize: `${fontSize * 1.5}px`, lineHeight: '1.4' }}>
          {children}
        </h2>
      );
    },
    h3({ children }) {
      return (
        <h3 style={{ fontSize: `${fontSize * 1.25}px`, lineHeight: '1.4' }}>
          {children}
        </h3>
      );
    },
    li({ children }) {
      return (
        <li style={{ fontSize: `${fontSize}px`, lineHeight: '1.6' }}>
          {children}
        </li>
      );
    }
  };

  return (
    <div
      className={cn(
        'mb-4',
        message.role === 'assistant' 
          ? 'bg-gray-100 dark:bg-gray-800 rounded-lg p-4' 
          : 'flex flex-col items-end text-right',
        getFontFamilyClass()
      )}
    >
      <div 
        className={cn(
          "prose dark:prose-invert max-w-none",
          message.role === 'user' && 'bg-gray-50 dark:bg-gray-700 rounded-lg p-4',
          getFontFamilyClass()
        )}
        style={{ 
          fontSize: `${fontSize}px`,
          lineHeight: '1.6',
          width: message.role === 'user' ? 'auto' : '100%'
        }}
      >
        {renderContent(message.content)}
      </div>
    </div>
  );
} 