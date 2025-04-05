import { Message } from '../types/chat';
import { useSettingStore } from '../stores/settingStore';

interface MessageItemProps {
  message: Message;
}

export function MessageItem({ message }: MessageItemProps) {
  const { themeColor } = useSettingStore();

  // 解码转义的 HTML 实体
  const decodeHtml = (html: string) => {
    const txt = document.createElement('textarea');
    txt.innerHTML = html;
    return txt.value;
  };

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
    };
    return themes[themeColor];
  };

  // 处理消息内容，将 think 标签的内容用特殊样式显示
  const renderContent = (content: string) => {
    const decodedContent = decodeHtml(content);
    const themeClasses = getThemeClasses();
    
    // 如果正在思考中，使用特殊样式
    if (message.isThinking) {
      return (
        <>
          {decodedContent.split(/(<think>|<\/think>)/).map((part, index) => {
            if (part === '<think>' || part === '</think>') {
              return null;
            }
            if (part) {
              return (
                <div key={`think-${index}`} 
                  className={`my-4 p-4 ${themeClasses.bg} rounded-xl border-l-4 ${themeClasses.border} shadow-sm`}
                >
                  <div className={`flex items-center gap-2 ${themeClasses.text} text-sm font-medium mb-2.5`}>
                    <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none">
                      <path d="M12 8V12L15 15" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
                      <circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth="2"/>
                    </svg>
                    思考过程
                  </div>
                  <div className="text-slate-700 dark:text-slate-200 leading-relaxed">{part}</div>
                </div>
              );
            }
            return null;
          })}
        </>
      );
    }
    
    // 使用正则表达式匹配 think 标签及其内容
    const parts = decodedContent.split(/(<think>.*?<\/think>)/gs);
    
    return parts.map((part, index) => {
      if (part.startsWith('<think>') && part.endsWith('</think>')) {
        // 提取 think 标签中的内容
        const thinkContent = part.slice(7, -8); // 移除 <think> 和 </think>
        
        return (
          <div key={`think-${index}`} 
            className={`my-4 p-4 ${themeClasses.bg} rounded-xl border-l-4 ${themeClasses.border} shadow-sm`}
          >
            <div className={`flex items-center gap-2 ${themeClasses.text} text-sm font-medium mb-2.5`}>
              <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none">
                <path d="M12 8V12L15 15" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
                <circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth="2"/>
              </svg>
              思考过程
            </div>
            <div className="text-slate-700 dark:text-slate-200 leading-relaxed">{thinkContent}</div>
          </div>
        );
      }
      
      // 返回普通文本内容
      return part ? <span key={`text-${index}`}>{part}</span> : null;
    });
  };

  return (
    <div
      className={`p-4 rounded-xl ${
        message.role === 'user'
          ? 'bg-blue-50 dark:bg-blue-900/30 border border-blue-100 dark:border-blue-800/30'
          : 'bg-slate-50 dark:bg-slate-800/50 border border-slate-100 dark:border-slate-700/30'
      }`}
    >
      <div className="font-medium text-slate-800 dark:text-slate-100 mb-2.5">
        {message.role === 'user' ? '你' : '助手'}
      </div>
      <div className="text-slate-700 dark:text-slate-200 whitespace-pre-wrap">
        {renderContent(message.content)}
      </div>
    </div>
  );
} 