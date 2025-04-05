import { FC } from 'react'
import { Message } from '../types/chat'
import { ThinkingIcon } from './icons/ThinkingIcon'
import { useSettingStore } from '../stores/settingStore'
import { cn } from '../lib/utils'

interface MessageItemProps {
  message: Message
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
        bg: 'bg-teal-50 dark:bg-teal-900/30',
        border: 'border-l-teal-400 dark:border-l-teal-500',
        text: 'text-teal-700 dark:text-teal-300',
      },
      sky: {
        bg: 'bg-sky-50 dark:bg-sky-900/30',
        border: 'border-l-sky-400 dark:border-l-sky-500',
        text: 'text-sky-700 dark:text-sky-300',
      },
      rose: {
        bg: 'bg-rose-50 dark:bg-rose-900/30',
        border: 'border-l-rose-400 dark:border-l-rose-500',
        text: 'text-rose-700 dark:text-rose-300',
      },
      purple: {
        bg: 'bg-purple-50 dark:bg-purple-900/30',
        border: 'border-l-purple-400 dark:border-l-purple-500',
        text: 'text-purple-700 dark:text-purple-300',
      },
    }
    return themes[themeColor]
  }

  const renderContent = (content: string) => {
    const decodedContent = decodeHtml(content)
    const themeClasses = getThemeClasses()
    
    const parts = decodedContent.split(/(<think>|<\/think>)/)
    
    return parts.map((part, index) => {
      if (part === '<think>' || part === '</think>') {
        return null
      }
      
      // 检查是否在 <think> 标签之间
      const isThinking = index > 0 && parts[index - 1] === '<think>'
      
      if (isThinking) {
        return (
          <div 
            key={index} 
            className={`my-4 p-4 ${themeClasses.bg} rounded-xl border-l-4 ${themeClasses.border} shadow-sm`}
          >
            <div className={`flex items-center gap-2 ${themeClasses.text} text-sm font-medium mb-2.5`}>
              <ThinkingIcon className="w-4 h-4" />
              思考过程
            </div>
            <div 
              className={cn(
                "text-slate-700 dark:text-slate-200 leading-relaxed",
                getFontFamilyClass()
              )}
              style={{ fontSize: `${fontSize}px` }}
            >
              {part}
            </div>
          </div>
        )
      }
      
      // 普通文本内容
      return part ? (
        <div 
          key={index} 
          className={cn(
            "text-slate-700 dark:text-slate-200 leading-relaxed",
            getFontFamilyClass()
          )}
          style={{ fontSize: `${fontSize}px` }}
        >
          {part}
        </div>
      ) : null
    })
  }

  return (
    <div 
      className={cn(
        "p-4",
        message.role === 'assistant' ? 'bg-gray-50 dark:bg-slate-800' : '',
        getFontFamilyClass()
      )}
      style={{ fontSize: `${fontSize}px` }}
    >
      <div className="flex items-start gap-4">
        <div className="w-8 h-8 rounded-full bg-blue-500 flex items-center justify-center text-white">
          {message.role === 'assistant' ? 'A' : 'U'}
        </div>
        <div className="flex-1 text-gray-900 dark:text-gray-100">
          {renderContent(message.content)}
        </div>
      </div>
    </div>
  )
} 