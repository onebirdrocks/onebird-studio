import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { 
  Message, 
  ChatHistory, 
  ChatState, 
  ChatComputedState,
  ChatAction 
} from '../types/chat'
import type { Model } from '../stores/modelStore'
import { chatWithOllama } from '../services/ollamaApi'
import { chatWithOpenAI } from '../services/openaiApi'
import { chatWithDeepSeek } from '../services/deepseekApi'

// 创建一个包含状态和计算属性的 store
type ChatStore = ChatState & ChatComputedState & ChatAction

export const useChatStore = create<ChatStore>()(
  persist(
    (set, get) => ({
      // 初始状态
      session: {
        currentChatId: null,
        isLoading: false,
        error: null
      },
      history: {
        items: {},
        order: []
      },
      ui: {
        isServiceAvailable: true,
        isModelAvailable: true
      },

      // 计算属性
      currentChat: null,
      currentMessages: [],
      sortedHistories: [],

      // 设置当前聊天 ID
      setCurrentChatId: (chatId) => {
        set(state => ({
          session: {
            ...state.session,
            currentChatId: chatId
          },
          // 更新计算属性
          currentChat: chatId ? state.history.items[chatId] : null,
          currentMessages: chatId ? state.history.items[chatId]?.messages || [] : []
        }))
      },

      // 创建新聊天
      createChat: (model) => {
        const chatId = Date.now().toString()
        const newChat: ChatHistory = {
          id: chatId,
          title: 'New Chat',
          messages: [],
          model,
          createdAt: Date.now(),
          updatedAt: Date.now(),
          isTemporaryTitle: true
        }

        set(state => {
          const newItems = { ...state.history.items, [chatId]: newChat }
          const newOrder = [chatId, ...state.history.order]
          
          return {
            history: {
              items: newItems,
              order: newOrder
            },
            session: {
              ...state.session,
              currentChatId: chatId,
              isLoading: false,
              error: null
            },
            // 更新计算属性
            currentChat: newChat,
            currentMessages: [],
            sortedHistories: newOrder.map(id => newItems[id])
          }
        })

        return chatId
      },

      // 删除聊天
      deleteChat: (chatId) => {
        set(state => {
          const { [chatId]: deletedChat, ...remainingItems } = state.history.items
          const newOrder = state.history.order.filter(id => id !== chatId)
          const newCurrentChatId = state.session.currentChatId === chatId ? null : state.session.currentChatId
          
          return {
            history: {
              items: remainingItems,
              order: newOrder
            },
            session: {
              ...state.session,
              currentChatId: newCurrentChatId
            },
            // 更新计算属性
            currentChat: newCurrentChatId ? remainingItems[newCurrentChatId] : null,
            currentMessages: newCurrentChatId ? remainingItems[newCurrentChatId]?.messages || [] : [],
            sortedHistories: newOrder.map(id => remainingItems[id])
          }
        })
      },

      // 更新聊天标题
      updateChatTitle: (chatId, title) => {
        set(state => {
          const chat = state.history.items[chatId]
          if (!chat) return state

          const updatedChat = {
            ...chat,
            title,
            isTemporaryTitle: false,
            updatedAt: Date.now()
          }

          const newItems = { ...state.history.items, [chatId]: updatedChat }
          return {
            history: {
              ...state.history,
              items: newItems
            },
            // 更新计算属性
            currentChat: state.session.currentChatId === chatId ? updatedChat : state.currentChat,
            sortedHistories: state.history.order.map(id => newItems[id])
          }
        })
      },

      // 更新聊天消息
      updateChatMessages: (chatId, messages) => {
        set(state => {
          const chat = state.history.items[chatId]
          if (!chat) return state

          const updatedChat = {
            ...chat,
            messages,
            updatedAt: Date.now()
          }

          const newItems = { ...state.history.items, [chatId]: updatedChat }
          return {
            history: {
              ...state.history,
              items: newItems
            },
            // 更新计算属性
            currentChat: state.session.currentChatId === chatId ? updatedChat : state.currentChat,
            currentMessages: state.session.currentChatId === chatId ? messages : state.currentMessages,
            sortedHistories: state.history.order.map(id => newItems[id])
          }
        })
      },

      // 发送消息
      sendMessage: async (content: string, model: Model) => {
        const state = get()
        let chatId = state.session.currentChatId
        
        // 如果没有当前聊天，创建一个新的
        if (!chatId) {
          chatId = get().createChat(model)
        }

        // 设置加载状态
        set(state => ({
          session: { ...state.session, isLoading: true, error: null }
        }))

        try {
          // 添加用户消息
          const newMessage: Message = {
            role: 'user',
            content
          }
          const currentMessages = [...get().currentMessages, newMessage]
          get().updateChatMessages(chatId, currentMessages)

          // 根据模型提供商选择对应的聊天服务
          const chatService = {
            ollama: chatWithOllama,
            openai: chatWithOpenAI,
            deepseek: chatWithDeepSeek
          }[model.provider]

          // 准备回调函数
          const callbacks = {
            onToken: (token: string) => {
              const messages = get().currentMessages
              const lastMessage = messages[messages.length - 1]
              
              // 转义 HTML 标签
              const escapedToken = token
                .replace(/&/g, '&amp;')
                .replace(/</g, '&lt;')
                .replace(/>/g, '&gt;')
                .replace(/"/g, '&quot;')
                .replace(/'/g, '&#039;')
              
              if (!lastMessage || lastMessage.role === 'user') {
                // 创建新的助手消息
                const newAssistantMessage: Message = {
                  role: 'assistant',
                  content: escapedToken
                }
                get().updateChatMessages(chatId!, [...messages, newAssistantMessage])
              } else {
                // 更新现有的助手消息
                lastMessage.content += escapedToken
                get().updateChatMessages(chatId!, [...messages])
              }
            },
            onError: (error: Error) => {
              console.error('Chat error:', error)
              set(state => ({
                session: {
                  ...state.session,
                  isLoading: false,
                  error: error.message
                }
              }))
            },
            onComplete: () => {
              set(state => ({
                session: {
                  ...state.session,
                  isLoading: false,
                  error: null
                }
              }))

              // 如果标题是临时的，生成新的标题
              const chat = get().currentChat
              if (chat?.isTemporaryTitle) {
                get().generateChatTitle(chatId!, content)
              }
            }
          }

          // 发送消息
          await chatService(model.id, currentMessages, callbacks)
        } catch (error) {
          console.error('Failed to send message:', error)
          set(state => ({
            session: {
              ...state.session,
              isLoading: false,
              error: error instanceof Error ? error.message : '发送消息失败'
            }
          }))
        }
      },

      // 清空消息
      clearMessages: () => {
        const currentChatId = get().session.currentChatId
        if (currentChatId) {
          get().updateChatMessages(currentChatId, [])
        }
      },

      // 生成聊天标题
      generateChatTitle: async (chatId: string, firstMessage: string) => {
        const chat = get().history.items[chatId]
        if (!chat || !chat.isTemporaryTitle) return

        try {
          // 过滤掉 think 标签中的内容
          const filteredMessage = firstMessage.replace(/<think>[\s\S]*?<\/think>/g, '').trim()
          
          const titleMessage = {
            role: 'user' as const,
            content: `请为以下对话生成一个简短的标题（不超过20个字）：${filteredMessage}`
          }

          let title = ''
          const callbacks = {
            onToken: (token: string) => {
              title += token
            },
            onError: (error: Error) => {
              console.error('生成标题失败:', error)
              get().updateChatTitle(chatId, '新对话')
            },
            onComplete: () => {
              title = title
                .replace(/["""]/g, '')
                .replace(/<think>[\s\S]*?<\/think>/g, '')
                .trim()
              get().updateChatTitle(chatId, title)
            }
          }

          switch (chat.model.provider) {
            case 'ollama':
              await chatWithOllama(chat.model.id, [titleMessage], callbacks)
              break
            case 'openai':
              await chatWithOpenAI(chat.model.id, [titleMessage], callbacks)
              break
            case 'deepseek':
              await chatWithDeepSeek(chat.model.id, [titleMessage], callbacks)
              break
          }
        } catch (error) {
          console.error('生成标题失败:', error)
          get().updateChatTitle(chatId, '新对话')
        }
      }
    }),
    {
      name: 'chat-store',
      partialize: (state) => ({
        history: state.history,
        session: {
          currentChatId: state.session.currentChatId
        }
      })
    }
  )
) 