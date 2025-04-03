import { useState } from 'react'

type ChatMessage = {
  role: 'user' | 'assistant'
  content: string
}

export function useChatLLM() {
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [isLoading, setIsLoading] = useState(false)

  const sendMessage = async (userInput: string) => {
    const newMessage: ChatMessage = { role: 'user', content: userInput }
    setMessages((prev) => [...prev, newMessage])
    setIsLoading(true)

    try {
      // 👇 模拟 LLM 请求，替换为你自己的服务调用
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: userInput })
      })

      const data = await response.json()

      const reply: ChatMessage = {
        role: 'assistant',
        content: data.reply || '🤖 这是模拟回复'
      }

      setMessages((prev) => [...prev, reply])
    } catch (err) {
      setMessages((prev) => [
        ...prev,
        { role: 'assistant', content: '❌ 网络错误或无响应' }
      ])
    } finally {
      setIsLoading(false)
    }
  }

  return {
    messages,
    isLoading,
    sendMessage
  }
}
