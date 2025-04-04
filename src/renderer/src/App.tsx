import { useState } from 'react'
import Chat from './Chat'
import ChatStream from './ChatStream'

function App(): JSX.Element {
  const [useStream, setUseStream] = useState(true)
  const [error, setError] = useState<Error | null>(null)

  if (error) {
    return (
      <div className="flex items-center justify-center h-screen bg-red-50 dark:bg-red-900/20">
        <div className="max-w-md p-6 bg-white dark:bg-gray-800 rounded-lg shadow-lg">
          <h2 className="text-xl font-semibold text-red-600 dark:text-red-400 mb-4">
            应用程序错误
          </h2>
          <p className="text-gray-600 dark:text-gray-300 mb-4">
            {error.message}
          </p>
          <button
            onClick={() => window.location.reload()}
            className="px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700"
          >
            重新加载应用
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="relative min-h-screen bg-white dark:bg-gray-900">
      <div className="fixed top-2 right-2 z-50">
        <button
          onClick={() => setUseStream(!useStream)}
          className="px-3 py-1 bg-yellow-500 text-black rounded-md text-sm hover:bg-yellow-400"
        >
          {useStream ? '切换到普通模式' : '切换到流式模式'}
        </button>
      </div>
      {useStream ? <ChatStream /> : <Chat />}
    </div>
  )
}

export default App