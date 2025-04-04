import { useState } from 'react'
import Chat from './Chat'
import ChatStream from './ChatStream'

function App(): JSX.Element {
  const [useStream, setUseStream] = useState(true)

  return (
    <div>
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