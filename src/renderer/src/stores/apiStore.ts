import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export interface ApiConfig {
  baseUrls: {
    ollama: string;
    openai: string;
    deepseek: string;
  };
  supportedModels: {
    [key: string]: Array<{
      id: string;
      name: string;
      maxTokens: number;
      description: string;
    }>;
  };
}

interface ApiState {
  // API 配置
  config: ApiConfig;
  // API 状态
  status: {
    ollama: {
      isAvailable: boolean;
      isLoading: boolean;
      error: string | null;
    };
    openai: {
      isAvailable: boolean;
      isLoading: boolean;
      error: string | null;
    };
    deepseek: {
      isAvailable: boolean;
      isLoading: boolean;
      error: string | null;
    };
  };
  
  // 方法
  setApiStatus: (
    provider: 'ollama' | 'openai' | 'deepseek',
    status: {
      isAvailable?: boolean;
      isLoading?: boolean;
      error?: string | null;
    }
  ) => void;
  
  updateConfig: (config: Partial<ApiConfig>) => void;
  
  // 获取特定提供商的配置
  getProviderConfig: (provider: 'ollama' | 'openai' | 'deepseek') => {
    baseUrl: string;
    supportedModels: Array<{
      id: string;
      name: string;
      maxTokens: number;
      description: string;
    }>;
  };
}

export const useApiStore = create<ApiState>()(
  persist(
    (set, get) => ({
      config: {
        baseUrls: {
          ollama: 'http://localhost:11434',
          openai: 'https://api.openai.com/v1',
          deepseek: 'https://api.deepseek.com/v1'
        },
        supportedModels: {
          ollama: [],  // 动态从服务获取
          openai: [
            {
              id: 'gpt-4-turbo-preview',
              name: 'GPT-4 Turbo',
              maxTokens: 128000,
              description: '最新的 GPT-4 模型，支持更长的上下文'
            },
            {
              id: 'gpt-4',
              name: 'GPT-4',
              maxTokens: 8192,
              description: '最强大的 GPT-4 模型'
            },
            {
              id: 'gpt-3.5-turbo',
              name: 'GPT-3.5 Turbo',
              maxTokens: 4096,
              description: '强大且经济的模型'
            }
          ],
          deepseek: [
            {
              id: 'deepseek-chat',
              name: 'DeepSeek Chat',
              maxTokens: 8192,
              description: '通用对话模型'
            },
            {
              id: 'deepseek-coder',
              name: 'DeepSeek Coder',
              maxTokens: 8192,
              description: '专业的代码助手'
            }
          ]
        }
      },
      status: {
        ollama: {
          isAvailable: false,
          isLoading: false,
          error: null
        },
        openai: {
          isAvailable: false,
          isLoading: false,
          error: null
        },
        deepseek: {
          isAvailable: false,
          isLoading: false,
          error: null
        }
      },

      setApiStatus: (provider, status) => {
        set(state => ({
          status: {
            ...state.status,
            [provider]: {
              ...state.status[provider],
              ...status
            }
          }
        }));
      },

      updateConfig: (config) => {
        set(state => ({
          config: {
            ...state.config,
            ...config
          }
        }));
      },

      getProviderConfig: (provider) => {
        const state = get();
        return {
          baseUrl: state.config.baseUrls[provider],
          supportedModels: state.config.supportedModels[provider]
        };
      }
    }),
    {
      name: 'api-store',
      partialize: (state) => ({
        config: state.config
      })
    }
  )
); 