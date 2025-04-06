import { FC } from 'react'
import { cn } from '../lib/utils'
import { useSettingStore } from '../stores/settingStore'

const Help: FC = () => {
  const { fontSize, fontFamily } = useSettingStore()

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

  return (
    <div className={cn(
      "p-8 max-w-4xl mx-auto",
      "prose dark:prose-invert",
      getFontFamilyClass()
    )}>
      <h1 style={{ fontSize: `${fontSize * 2}px` }}>Onebird Studio</h1>
      
      <section className="mb-12">
        <div className="bg-blue-50 dark:bg-slate-800 p-6 rounded-lg mb-6">
          <p className="text-lg mb-4">
            OneBird Studio 是一个极简主义的本地优先桌面应用程序，专为创作者、独立开发者和数字游民打造，
            帮助他们跨时区、跨模型地工作。
          </p>
          <div className="flex flex-col space-y-2">
            <a 
              href="https://onebird.ai" 
              target="_blank" 
              rel="noopener noreferrer"
              className="text-blue-600 dark:text-blue-400 hover:underline flex items-center"
            >
              <svg className="w-5 h-5 mr-2" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 01-9 9m9-9a9 9 0 00-9-9m9 9H3m9 9a9 9 0 01-9-9m9 9c1.657 0 3-4.03 3-9s-1.343-9-3-9m0 18c-1.657 0-3-4.03-3-9s1.343-9 3-9m-9 9a9 9 0 019-9" />
              </svg>
              访问官网 onebird.ai
            </a> 
            <a 
              href="https://github.com/onebirdrocks/onebird-studio" 
              target="_blank" 
              rel="noopener noreferrer"
              className="text-blue-600 dark:text-blue-400 hover:underline flex items-center"
            >
              <svg className="w-5 h-5 mr-2" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19c-5 1.5-5-2.5-7-3m14 6v-3.87a3.37 3.37 0 0 0-.94-2.61c3.14-.35 6.44-1.54 6.44-7A5.44 5.44 0 0 0 20 4.77 5.07 5.07 0 0 0 19.91 1S18.73.65 16 2.48a13.38 13.38 0 0 0-7 0C6.27.65 5.09 1 5.09 1A5.07 5.07 0 0 0 5 4.77a5.44 5.44 0 0 0-1.5 3.78c0 5.42 3.3 6.61 6.44 7A3.37 3.37 0 0 0 9 18.13V22" />
              </svg>
              在 GitHub 上给我们点赞 ⭐  
            </a> 
            <a 
              href="https://discord.gg/onebird" 
              target="_blank" 
              rel="noopener noreferrer"
              className="text-blue-600 dark:text-blue-400 hover:underline flex items-center"
            >
              <svg className="w-5 h-5 mr-2" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.82 4.26a10.14 10.14 0 0 0-.53 1.1 14.66 14.66 0 0 0-4.58 0 10.14 10.14 0 0 0-.53-1.1 16 16 0 0 0-4.13 1.3 17.33 17.33 0 0 0-3 11.59 16.6 16.6 0 0 0 5.07 2.59A12.89 12.89 0 0 0 8.23 18a9.65 9.65 0 0 1-1.71-.83 3.39 3.39 0 0 0 .42-.33 11.66 11.66 0 0 0 10.12 0q.21.18.42.33a10.84 10.84 0 0 1-1.71.84 12.41 12.41 0 0 0 1.08 1.78 16.44 16.44 0 0 0 5.06-2.59 17.22 17.22 0 0 0-3-11.59 16.09 16.09 0 0 0-4.09-1.35zM8.68 14.81a1.94 1.94 0 0 1-1.8-2 1.93 1.93 0 0 1 1.8-2 1.93 1.93 0 0 1 1.8 2 1.93 1.93 0 0 1-1.8 2zm6.64 0a1.94 1.94 0 0 1-1.8-2 1.93 1.93 0 0 1 1.8-2 1.92 1.92 0 0 1 1.8 2 1.92 1.92 0 0 1-1.8 2z" />
              </svg>
              加入 Discord 社区
            </a>
          </div>
        </div>
      </section>

      <section>
        <h2 style={{ fontSize: `${fontSize * 1.5}px` }}>基本功能</h2>
        <ul>
          <li>支持远程模型 + 本地模型部署</li>
          <li>模式 + MCP </li>
          <li>语音交互 + 3D增强</li>
        </ul>
      </section>

      
    </div>
  )
}

export default Help 