import { FC, useState, useEffect } from 'react'
import { Link, useLocation, Outlet } from 'react-router-dom'
import { cn } from '../lib/utils'
import { ChatHistory } from '../components/ChatHistory'

const MainLayout: FC = () => {
  const location = useLocation()
  const [sidebarOpen, setSidebarOpen] = useState(true)
  const [isDark, setIsDark] = useState(() => {
    if (typeof window !== 'undefined') {
      return document.documentElement.classList.contains('dark')
    }
    return false
  })

  useEffect(() => {
    document.documentElement.classList.toggle('dark', isDark)
  }, [isDark])

  const navItems = [
    {
      name: '聊天',
      path: '/chat',
      icon: (
        <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
        </svg>
      )
    },
    {
      name: '设置',
      path: '/settings',
      icon: (
        <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M12.22 2h-.44a2 2 0 0 0-2 2v.18a2 2 0 0 1-1 1.73l-.43.25a2 2 0 0 1-2 0l-.15-.08a2 2 0 0 0-2.73.73l-.22.38a2 2 0 0 0 .73 2.73l.15.1a2 2 0 0 1 1 1.72v.51a2 2 0 0 1-1 1.74l-.15.09a2 2 0 0 0-.73 2.73l.22.38a2 2 0 0 0 2.73.73l.15-.08a2 2 0 0 1 2 0l.43.25a2 2 0 0 1 1 1.73V20a2 2 0 0 0 2 2h.44a2 2 0 0 0 2-2v-.18a2 2 0 0 1 1-1.73l.43-.25a2 2 0 0 1 2 0l.15.08a2 2 0 0 0 2.73-.73l.22-.39a2 2 0 0 0-.73-2.73l-.15-.08a2 2 0 0 1-1-1.74v-.5a2 2 0 0 1 1-1.74l.15-.09a2 2 0 0 0 .73-2.73l-.22-.38a2 2 0 0 0-2.73-.73l-.15.08a2 2 0 0 1-2 0l-.43-.25a2 2 0 0 1-1-1.73V4a2 2 0 0 0-2-2z" />
          <circle cx="12" cy="12" r="3" />
        </svg>
      )
    }
  ]

  return (
    <div className="flex h-screen bg-white dark:bg-slate-900">
      {/* 左侧功能导航 */}
      <nav className="w-16 bg-gray-100 dark:bg-slate-800 flex flex-col items-center py-4 space-y-4">
        {/* 主题切换按钮 */}
        <button
          onClick={() => setIsDark(!isDark)}
          className={cn(
            'p-2 rounded-lg transition-colors',
            'text-gray-600 hover:text-gray-900 dark:text-slate-400 dark:hover:text-white',
            'hover:bg-gray-200 dark:hover:bg-slate-700'
          )}
          title={isDark ? '切换到亮色模式' : '切换到暗色模式'}
        >
          {isDark ? (
            <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="12" r="5" />
              <line x1="12" y1="1" x2="12" y2="3" />
              <line x1="12" y1="21" x2="12" y2="23" />
              <line x1="4.22" y1="4.22" x2="5.64" y2="5.64" />
              <line x1="18.36" y1="18.36" x2="19.78" y2="19.78" />
              <line x1="1" y1="12" x2="3" y2="12" />
              <line x1="21" y1="12" x2="23" y2="12" />
              <line x1="4.22" y1="19.78" x2="5.64" y2="18.36" />
              <line x1="18.36" y1="5.64" x2="19.78" y2="4.22" />
            </svg>
          ) : (
            <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" />
            </svg>
          )}
        </button>

        {/* 导航项 */}
        {navItems.map((item) => (
          <Link
            key={item.path}
            to={item.path}
            className={cn(
              'p-2 rounded-lg transition-colors',
              location.pathname.startsWith(item.path) 
                ? 'bg-gray-200 text-gray-900 dark:bg-slate-700 dark:text-white' 
                : 'text-gray-600 hover:text-gray-900 dark:text-slate-400 dark:hover:text-white hover:bg-gray-200 dark:hover:bg-slate-700'
            )}
            title={item.name}
          >
            {item.icon}
          </Link>
        ))}
      </nav>

      {/* 聊天历史侧边栏 */}
      {location.pathname.startsWith('/chat') && (
        <div className={cn(
          'border-r transition-all duration-300',
          'bg-gray-50 dark:bg-slate-800 border-gray-200 dark:border-slate-700',
          sidebarOpen ? 'w-64' : 'w-0'
        )}>
          <ChatHistory 
            sidebarOpen={sidebarOpen}
            onToggleSidebar={() => setSidebarOpen(!sidebarOpen)}
          />
        </div>
      )}

      {/* 主内容区域 */}
      <main className="flex-1 overflow-hidden bg-white dark:bg-slate-900">
        <Outlet />
      </main>
    </div>
  )
}

export default MainLayout 