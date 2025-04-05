import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { Message, ChatHistory } from '../types/chat'
import type { Model } from '../stores/modelStore'
import { chatWithOllama } from '../services/ollamaApi'
import { chatWithOpenAI } from '../services/openaiApi'
import { chatWithDeepSeek } from '../services/deepseekApi'

interface ChatState {
  // 状态
  messages: Message[]
  histories: ChatHistory[]
  currentChatId: string | null
  isLoading: boolean
  error: string | null
  isServiceAvailable: boolean
  isModelAvailable: boolean

  // 方法
  setCurrentChatId: (chatId: string | null) => void
  createNewChat: (model: Model) => string
  deleteChat: (chatId: string) => void
  updateChatTitle: (chatId: string, title: string) => void
  updateChatMessages: (chatId: string, messages: Message[]) => void
  sendMessage: (content: string, model: Model) => Promise<void>
  clearMessages: () => void
  generateChatTitle: (chatId: string, firstMessage: string) => Promise<void>
}

export const useChatStore = create<ChatState>()(
  persist(
    (set, get) => ({
      // 初始状态
      messages: [],
      histories: [],
      currentChatId: null,
      isLoading: false,
      error: null,
      isServiceAvailable: true,
      isModelAvailable: true,

      // 设置当前聊天 ID
      setCurrentChatId: (chatId) => {
        set({ currentChatId: chatId })
        if (chatId) {
          const chat = get().histories.find(h => h.id === chatId)
          if (chat) {
            set({ messages: chat.messages })
          }
        } else {
          set({ messages: [] })
        }
      },

      // 创建新聊天
      createNewChat: (model) => {
        const newChat: ChatHistory = {
          id: Date.now().toString(),
          title: 'New Chat',
          messages: [],
          model,
          createdAt: Date.now(),
          updatedAt: Date.now(),
          isTemporaryTitle: true
        }

        set(state => ({
          histories: [newChat, ...state.histories],
          currentChatId: newChat.id,
          messages: []
        }))

        return newChat.id
      },

      // 删除聊天
      deleteChat: (chatId) => {
        set(state => ({
          histories: state.histories.filter(chat => chat.id !== chatId),
          currentChatId: state.currentChatId === chatId ? null : state.currentChatId,
          messages: state.currentChatId === chatId ? [] : state.messages
        }))
      },

      // 更新聊天标题
      updateChatTitle: (chatId, title) => {
        set(state => ({
          histories: state.histories.map(chat =>
            chat.id === chatId
              ? {
                  ...chat,
                  title,
                  isTemporaryTitle: false,
                  updatedAt: Date.now()
                }
              : chat
          )
        }))
      },

      // 更新聊天消息
      updateChatMessages: (chatId, messages) => {
        set(state => ({
          messages,
          histories: state.histories.map(chat =>
            chat.id === chatId
              ? {
                  ...chat,
                  messages,
                  updatedAt: Date.now()
                }
              : chat
          )
        }))
      },

      // 发送消息
      sendMessage: async (content, model) => {
        const state = get()
        if (!state.currentChatId) {
          const chatId = get().createNewChat(model)
          set({ currentChatId: chatId })
        }

        set({ isLoading: true, error: null })

        const newMessage: Message = {
          role: 'user' as const,
          content
        }

        const newMessages = [...state.messages, newMessage]
        get().updateChatMessages(state.currentChatId!, newMessages)

        try {
          let streamingMessage = ''
          const onMessage = (token: string) => {
            streamingMessage += token
            const currentMessages = [...newMessages, {
              role: 'assistant' as const,
              content: streamingMessage
            }]
            get().updateChatMessages(state.currentChatId!, currentMessages)
          }

          // 创建 AbortController 用于取消请求
          const abortController = new AbortController()

          switch (model.provider) {
            case 'ollama':
              await chatWithOllama(
                model.id,
                newMessages,
                onMessage,
                abortController.signal
              )
              break
            case 'openai':
              await chatWithOpenAI(
                model.id,
                newMessages,
                onMessage,
                abortController.signal
              )
              break
            case 'deepseek':
              await chatWithDeepSeek(
                model.id,
                newMessages,
                onMessage,
                abortController.signal
              )
              break
            default:
              throw new Error(`不支持的提供商: ${model.provider}`)
          }

          // 如果是新对话的第一条消息，生成标题
          if (state.messages.length === 0) {
            setTimeout(() => get().generateChatTitle(state.currentChatId!, content), 1000)
          }

          set({ isLoading: false })
        } catch (error) {
          set({
            error: error instanceof Error ? error.message : '发送消息时出错',
            isLoading: false
          })
        }
      },

      // 清空消息
      clearMessages: () => {
        set({ messages: [], error: null })
        const currentChatId = get().currentChatId
        if (currentChatId) {
          get().updateChatMessages(currentChatId, [])
        }
      },

      // 生成聊天标题
      generateChatTitle: async (chatId: string, firstMessage: string) => {
        const chat = get().histories.find(h => h.id === chatId)
        if (!chat || !chat.isTemporaryTitle) return

        try {
          const titleMessage = {
            role: 'user' as const,
            content: `请为这个对话生成一个简短的标题（不超过20个字）。对话的第一条消息是：${firstMessage}`
          }

          let title = ''
          const onMessage = (token: string) => {
            title += token
          }

          const abortController = new AbortController()

          switch (chat.model.provider) {
            case 'ollama':
              await chatWithOllama(
                chat.model.id,
                [titleMessage],
                onMessage,
                abortController.signal
              )
              break
            case 'openai':
              await chatWithOpenAI(
                chat.model.id,
                [titleMessage],
                onMessage,
                abortController.signal
              )
              break
            case 'deepseek':
              await chatWithDeepSeek(
                chat.model.id,
                [titleMessage],
                onMessage,
                abortController.signal
              )
              break
          }

          // 清理标题中可能的引号
          title = title.replace(/["""]/g, '').trim()
          get().updateChatTitle(chatId, title)
        } catch (error) {
          console.error('生成标题失败:', error)
          // 如果生成标题失败，使用默认标题
          get().updateChatTitle(chatId, '新对话')
        }
      }
    }),
    {
      name: 'chat-store',
      partialize: (state) => ({
        histories: state.histories,
        currentChatId: state.currentChatId
      })
    }
  )
) 