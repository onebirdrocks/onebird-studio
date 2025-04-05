import { FC } from 'react'

const Agent: FC = () => {
  return (
    <div className="flex-1 p-6">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-2xl font-bold mb-6 dark:text-white">Agent 功能</h1>
        
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
          <div className="space-y-6">
            <div className="text-center py-12">
              <div className="text-6xl mb-4">🤖</div>
              <h2 className="text-xl font-semibold mb-2 dark:text-white">Agent 功能即将推出</h2>
              <p className="text-gray-600 dark:text-gray-300">
                我们正在开发更智能的 Agent 功能，敬请期待！
              </p>
            </div>
            
            <div className="border-t border-gray-200 dark:border-gray-700 pt-6">
              <h3 className="text-lg font-semibold mb-4 dark:text-white">即将推出的功能：</h3>
              <ul className="space-y-3 text-gray-600 dark:text-gray-300">
                <li className="flex items-center">
                  <span className="mr-2">✨</span>
                  自动任务处理
                </li>
                <li className="flex items-center">
                  <span className="mr-2">🔄</span>
                  智能工作流
                </li>
                <li className="flex items-center">
                  <span className="mr-2">🎯</span>
                  个性化助手
                </li>
                <li className="flex items-center">
                  <span className="mr-2">🤝</span>
                  多Agent协作
                </li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default Agent 