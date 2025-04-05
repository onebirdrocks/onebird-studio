import { create } from 'zustand'
import { persist } from 'zustand/middleware'

export interface Model {
  id: string
  name: string
  provider: 'ollama' | 'openai' | 'deepseek'
  maxTokens?: number
}

interface ModelState {
  // 状态
  models: Model[]
  selectedModel: Model | null
  apiKeys: {
    openai?: string
    deepseek?: string
  }
  
  // 方法
  setSelectedModel: (model: Model | null) => void
  addModel: (model: Model) => void
  removeModel: (modelId: string) => void
  setApiKey: (provider: 'openai' | 'deepseek', key: string) => void
  removeApiKey: (provider: 'openai' | 'deepseek') => void
}

export const useModelStore = create<ModelState>()(
  persist(
    (set) => ({
      // 初始状态
      models: [
        {
          id: 'llama2',
          name: 'Llama 2',
          provider: 'ollama',
        },
        {
          id: 'gpt-3.5-turbo',
          name: 'GPT-3.5 Turbo',
          provider: 'openai',
          maxTokens: 4096
        },
        {
          id: 'deepseek-chat',
          name: 'DeepSeek Chat',
          provider: 'deepseek',
          maxTokens: 4096
        }
      ],
      selectedModel: null,
      apiKeys: {},

      // 设置选中的模型
      setSelectedModel: (model) => {
        set({ selectedModel: model })
      },

      // 添加新模型
      addModel: (model) => {
        set((state) => ({
          models: [...state.models, model]
        }))
      },

      // 移除模型
      removeModel: (modelId) => {
        set((state) => ({
          models: state.models.filter(m => m.id !== modelId),
          selectedModel: state.selectedModel?.id === modelId ? null : state.selectedModel
        }))
      },

      // 设置 API 密钥
      setApiKey: (provider, key) => {
        set((state) => ({
          apiKeys: {
            ...state.apiKeys,
            [provider]: key
          }
        }))
      },

      // 移除 API 密钥
      removeApiKey: (provider) => {
        set((state) => {
          const newApiKeys = { ...state.apiKeys }
          delete newApiKeys[provider]
          return { apiKeys: newApiKeys }
        })
      }
    }),
    {
      name: 'model-storage',
      // 只持久化 apiKeys，其他状态不需要持久化
      partialize: (state) => ({
        apiKeys: state.apiKeys
      })
    }
  )
) 