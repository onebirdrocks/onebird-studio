import { useState } from 'react'

interface ChatMessage {
  role: 'user' | 'assistant'
  content: string
}

export function useChatLLM() {
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [isLoading, setIsLoading] = useState(false)

  const sendMessage = async (userInput: string) => {
    const userMessage: ChatMessage = { role: 'user', content: userInput }
    setMessages((prev) => [...prev, userMessage])
    setIsLoading(true)

    try {
      const response = await fetch('/api/chat/stream', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ messages: [...messages, userMessage] })
      })

      const reader = response.body?.getReader()
      const decoder = new TextDecoder('utf-8')
      let assistantMessage = ''

      const streamMessage: ChatMessage = { role: 'assistant', content: '' }
      setMessages((prev) => [...prev, streamMessage])

      while (reader && true) {
        const { done, value } = await reader.read()
        if (done) break

        const chunk = decoder.decode(value, { stream: true })
        assistantMessage += chunk
        setMessages((prev) => {
          const updated = [...prev]
          updated[updated.length - 1] = { role: 'assistant', content: assistantMessage }
          return updated
        })
      }
    } catch (error) {
      setMessages((prev) => [...prev, { role: 'assistant', content: '⚠️ 请求失败，请稍后再试。' }])
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
