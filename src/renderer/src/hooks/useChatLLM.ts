import { useState, useEffect } from 'react'
import { sendMessageToOllama, checkOllamaStatus, ChatMessage } from '../services/ollamaApi'

export function useChatLLM() {
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [serviceStatus, setServiceStatus] = useState({
    serviceAvailable: false,
    modelAvailable: false
  })

  // 定期检查服务状态
  useEffect(() => {
    const checkStatus = async () => {
      const status = await checkOllamaStatus();
      console.log('Service status:', status);
      setServiceStatus(status);
    };

    // 立即检查一次
    checkStatus();

    // 每 5 秒检查一次
    const interval = setInterval(checkStatus, 5000);

    return () => clearInterval(interval);
  }, []);

  const sendMessage = async (userInput: string) => {
    const userMessage: ChatMessage = { role: 'user', content: userInput }
    setMessages(prev => [...prev, userMessage])
    setIsLoading(true)

    try {
      // 先检查服务状态
      const status = await checkOllamaStatus()
      if (!status.serviceAvailable) {
        throw new Error('Ollama 服务未运行，请启动服务：ollama serve')
      }
      if (!status.modelAvailable) {
        throw new Error('未找到 llama2 模型，请先安装：ollama pull llama2')
      }

      const allMessages = [...messages, userMessage]
      const response = await sendMessageToOllama(allMessages)
      
      const assistantMessage: ChatMessage = {
        role: 'assistant',
        content: response
      }
      
      setMessages(prev => [...prev, assistantMessage])
    } catch (error) {
      console.error('Error sending message:', error)
      setMessages(prev => [
        ...prev,
        { 
          role: 'assistant', 
          content: error instanceof Error ? error.message : '发生未知错误，请检查控制台输出'
        }
      ])
    } finally {
      setIsLoading(false)
    }
  }

  return {
    messages,
    isLoading,
    sendMessage,
    serviceStatus
  }
}