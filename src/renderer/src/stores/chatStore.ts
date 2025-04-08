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
    (set, get) => {
      // 为每个聊天维护独立的 AbortController
      const abortControllers: Record<string, AbortController> = {};

      // 计算 sortedHistories 的辅助函数
      const computeSortedHistories = (items: Record<string, ChatHistory>, order: string[]) => {
        return order.map(id => items[id]).sort((a, b) => b.updatedAt - a.updatedAt)
      }

      return {
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

        // 初始化 store
        initializeStore: () => {
          const state = get()
          const sortedHistories = computeSortedHistories(state.history.items, state.history.order)
          
          if (sortedHistories.length > 0) {
            // 如果没有当前聊天，选择最新的一个
            const chatId = state.session.currentChatId || sortedHistories[0].id
            const currentChat = state.history.items[chatId]
            
            if (currentChat) {
              set({
                session: {
                  ...state.session,
                  currentChatId: chatId,
                  isLoading: false,
                  error: null
                },
                currentChat: currentChat,
                currentMessages: currentChat.messages || [],
                sortedHistories
              })
            }
          } else {
            set({ 
              sortedHistories,
              session: {
                ...state.session,
                currentChatId: null,
                isLoading: false,
                error: null
              },
              currentChat: null,
              currentMessages: []
            })
          }
        },

        // 设置当前聊天 ID
        setCurrentChatId: (chatId) => {
          // 不再在切换聊天时取消请求
          set(state => ({
            session: {
              ...state.session,
              currentChatId: chatId,
              isLoading: false,
              error: null
            },
            currentChat: chatId ? state.history.items[chatId] : null,
            currentMessages: chatId ? state.history.items[chatId]?.messages || [] : [],
            sortedHistories: computeSortedHistories(state.history.items, state.history.order)
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
          // 如果删除的聊天有正在进行的请求，取消它
          if (abortControllers[chatId]) {
            abortControllers[chatId].abort()
            delete abortControllers[chatId]
          }

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
            
            // 只有当前选中的聊天是被更新的聊天时，才更新 currentMessages
            const shouldUpdateCurrentMessages = state.session.currentChatId === chatId
            
            return {
              history: {
                ...state.history,
                items: newItems
              },
              currentChat: shouldUpdateCurrentMessages ? updatedChat : state.currentChat,
              currentMessages: shouldUpdateCurrentMessages ? messages : state.currentMessages,
              sortedHistories: state.history.order.map(id => newItems[id])
            }
          })
        },

        // 发送消息
        sendMessage: async (content: string, model: Model) => {
          const state = get()
          let chatId = state.session.currentChatId
          
          if (!chatId) {
            chatId = get().createChat(model)
          }

          // 如果这个聊天已经有正在进行的请求，就取消它
          if (abortControllers[chatId]) {
            abortControllers[chatId].abort()
          }
          
          // 为这个聊天创建新的 AbortController
          abortControllers[chatId] = new AbortController()

          set(state => ({
            session: { ...state.session, isLoading: true, error: null }
          }))

          try {
            const newMessage: Message = {
              role: 'user',
              content
            }
            
            // 获取这个特定聊天的消息
            const chatMessages = [...(state.history.items[chatId]?.messages || []), newMessage]
            get().updateChatMessages(chatId, chatMessages)

            const chatService = {
              ollama: chatWithOllama,
              openai: chatWithOpenAI,
              deepseek: chatWithDeepSeek
            }[model.provider]

            // 使用这个聊天的 AbortController
            await chatService(
              model.provider === 'ollama' ? model.name : model.id,
              chatMessages,
              {
                onToken: (token) => {
                  // 获取最新的状态
                  const currentState = get()
                  // 获取这个特定聊天的消息
                  const messages = [...(currentState.history.items[chatId]?.messages || [])]
                  const lastMessage = messages[messages.length - 1]
                  
                  let updatedMessages: Message[]
                  if (lastMessage && lastMessage.role === 'assistant') {
                    // 更新最后一条消息
                    lastMessage.content += token
                    updatedMessages = messages
                  } else {
                    // 添加新的助手消息
                    updatedMessages = [
                      ...messages,
                      {
                        role: 'assistant',
                        content: token
                      }
                    ]
                  }
                  
                  // 直接更新这个聊天的消息
                  get().updateChatMessages(chatId, updatedMessages)
                },
                onError: (error) => {
                  // 只更新全局加载状态
                  set(state => ({
                    session: {
                      ...state.session,
                      error: error.message,
                      isLoading: false
                    }
                  }))
                },
                onComplete: () => {
                  // 请求完成后删除这个聊天的 AbortController
                  delete abortControllers[chatId]
                  // 只更新全局加载状态
                  set(state => ({
                    session: { ...state.session, isLoading: false }
                  }))

                  // 如果是新聊天且标题是临时的，生成新的标题
                  const chat = get().history.items[chatId]
                  if (chat?.isTemporaryTitle) {
                    get().generateChatTitle(chatId, content)
                  }
                }
              },
              abortControllers[chatId].signal
            )
          } catch (error) {
            // 发生错误时也要删除这个聊天的 AbortController
            delete abortControllers[chatId]
            set(state => ({
              session: {
                ...state.session,
                error: error instanceof Error ? error.message : '发送消息失败',
                isLoading: false
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
              content: `请为以下对话生成一个简短的标题（不超过20个字，直接返回标题文本即可，不要加任何其他内容）：${filteredMessage}`
            }

            let title = ''
            const titleAbortController = new AbortController()

            const callbacks = {
              onToken: (token: string) => {
                // 移除可能的引号和换行
                const cleanToken = token.replace(/["""'\n]/g, '').trim()
                if (cleanToken) {
                  title += cleanToken
                }
              },
              onError: (error: Error) => {
                console.error('生成标题失败:', error)
                get().updateChatTitle(chatId, '新对话')
              },
              onComplete: () => {
                // 清理标题文本
                const cleanTitle = title
                  .replace(/["""'\n]/g, '')
                  .replace(/<think>[\s\S]*?<\/think>/g, '')
                  .replace(/^["']|["']$/g, '') // 移除开头和结尾的引号
                  .trim()
                
                // 如果生成的标题为空，使用默认标题
                if (!cleanTitle) {
                  get().updateChatTitle(chatId, '新对话')
                  return
                }

                // 限制标题长度
                const finalTitle = cleanTitle.length > 20 
                  ? cleanTitle.slice(0, 20) + '...'
                  : cleanTitle

                get().updateChatTitle(chatId, finalTitle)
              }
            }

            const chatService = {
              ollama: chatWithOllama,
              openai: chatWithOpenAI,
              deepseek: chatWithDeepSeek
            }[chat.model.provider]

            await chatService(
              chat.model.provider === 'ollama' ? chat.model.name : chat.model.id,
              [titleMessage], 
              callbacks,
              titleAbortController.signal
            )
          } catch (error) {
            console.error('生成标题失败:', error)
            get().updateChatTitle(chatId, '新对话')
          }
        }
      }
    },
    {
      name: 'chat-store',
      partialize: (state) => ({
        history: state.history,
        session: {
          currentChatId: state.session.currentChatId
        }
      }),
      onRehydrateStorage: () => (state) => {
        // 在恢复存储后立即初始化
        if (state) {
          state.initializeStore()
        }
      }
    }
  )
) 