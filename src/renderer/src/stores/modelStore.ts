import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { useApiStore } from './apiStore'

export interface Model {
  id: string
  name: string
  provider: 'ollama' | 'openai' | 'deepseek'
  maxTokens?: number
  details?: {
    format?: string
    family?: string
    parameterSize?: string
    quantizationLevel?: string
  }
}

interface ModelState {
  // 状态
  selectedModel: Model | null
  models: Model[]
  apiKeys: {
    openai?: string
    deepseek?: string
  }
  
  // 方法
  setSelectedModel: (model: Model | null) => void
  setApiKey: (provider: 'openai' | 'deepseek', key: string) => void
  removeApiKey: (provider: 'openai' | 'deepseek') => void
}

export const useModelStore = create<ModelState>()(
  persist(
    (set) => ({
      selectedModel: null,
      models: [],
      apiKeys: {},

      // 设置选中的模型
      setSelectedModel: (model) => {
        set({ selectedModel: model })
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
          const { [provider]: _, ...rest } = state.apiKeys
          return { apiKeys: rest }
        })
      }
    }),
    {
      name: 'model-store',
      partialize: (state) => ({
        apiKeys: state.apiKeys,
        selectedModel: state.selectedModel
      })
    }
  )
) 