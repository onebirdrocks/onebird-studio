import { useModelStore } from '../stores/modelStore'
import type { Model } from '../stores/modelStore'

export function useModelSelection() {
  const {
    models,
    selectedModel,
    setSelectedModel,
    apiKeys
  } = useModelStore()

  const getApiKey = (provider: 'openai' | 'deepseek') => {
    return apiKeys[provider]
  }

  return {
    models,
    selectedModel,
    setSelectedModel,
    getApiKey
  }
} 