import type { Message } from './chat';

/**
 * API 提供商类型
 */
export type Provider = 'ollama' | 'openai' | 'deepseek';

/**
 * API 状态
 */
export interface ApiStatus {
  isAvailable: boolean;
  isLoading: boolean;
  error: string | null;
}

/**
 * API 配置
 */
export interface ApiConfig {
  baseUrl: string;
  supportedModels: ModelConfig[];
}

/**
 * 模型配置
 */
export interface ModelConfig {
  id: string;
  name: string;
  maxTokens: number;
  description: string;
}

/**
 * 模型详情
 */
export interface ModelDetails {
  maxTokens?: number;
  description?: string;
  format?: string;
  family?: string;
  parameterSize?: string;
  quantizationLevel?: string;
}

/**
 * API 模型
 */
export interface ApiModel {
  id: string;
  name: string;
  details: ModelDetails;
}

/**
 * Ollama 相关类型
 */
export interface OllamaModel {
  name: string;
  modified_at: string;
  size: number;
  digest: string;
  details: {
    format: string;
    family: string;
    parameter_size: string;
    quantization_level: string;
  };
}

export interface OllamaListResponse {
  models: OllamaModel[];
}

export interface OllamaChatResponse {
  message: {
    role: string;
    content: string;
  };
  done: boolean;
}

/**
 * 聊天回调函数类型
 */
export interface ChatCallbacks {
  onToken: (token: string) => void;
  onError: (error: Error) => void;
  onComplete: () => void;
}

/**
 * API 服务接口
 */
export interface ApiService {
  getModels: () => Promise<ApiModel[]>;
  checkAvailable: () => Promise<boolean>;
  checkApiKey?: (apiKey: string) => Promise<boolean>;
  chat: (
    modelId: string,
    messages: Message[],
    callbacks: ChatCallbacks,
    signal?: AbortSignal
  ) => Promise<void>;
}

/**
 * API Store 状态
 */
export interface ApiState {
  providers: Record<Provider, ApiConfig>;
  status: Record<Provider, ApiStatus>;
  getProviderConfig: (provider: Provider) => ApiConfig;
  setApiStatus: (provider: Provider, status: Partial<ApiStatus>) => void;
}

/**
 * API 服务基础配置接口
 */
export interface BaseServiceConfig {
  apiKey?: string;
  baseUrl?: string;
  timeout?: number;
  maxRetries?: number;
}

/**
 * OpenAI 服务配置
 */
export interface OpenAIServiceConfig extends BaseServiceConfig {
  organization?: string;
  defaultModel?: string;
}

/**
 * Ollama 服务配置
 */
export interface OllamaServiceConfig extends BaseServiceConfig {
  localPort?: number;
  defaultModel?: string;
}

/**
 * DeepSeek 服务配置
 */
export interface DeepSeekServiceConfig extends BaseServiceConfig {
  defaultModel?: string;
  apiVersion?: string;
}

/**
 * 服务配置映射类型
 */
export type ServiceConfigMap = {
  openai: OpenAIServiceConfig;
  ollama: OllamaServiceConfig;
  deepseek: DeepSeekServiceConfig;
  [key: string]: BaseServiceConfig;
}; 