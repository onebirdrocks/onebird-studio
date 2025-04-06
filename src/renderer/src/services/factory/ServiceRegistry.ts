import { ApiServiceFactory } from './ApiServiceFactory';
import { OpenAIService } from '../openai/OpenAIService';
import { chatWithOllama, checkOllamaAvailable, getOllamaModels } from '../ollamaApi';

/**
 * 初始化默认的服务注册
 */
export function initializeDefaultServices(): void {
  const factory = ApiServiceFactory.getInstance();

  // 注册默认服务
  try {
    factory.registerService('openai', OpenAIService);
    // Ollama 服务已经移动到 ollamaApi.ts，不再需要注册
  } catch (error) {
    console.warn('Some default services were already registered:', error);
  }
}

/**
 * 重置服务注册到默认状态
 */
export function resetToDefaultServices(): void {
  const factory = ApiServiceFactory.getInstance();

  // 清除所有现有的注册
  factory.getRegisteredProviders().forEach(provider => {
    try {
      factory.unregisterService(provider);
    } catch (error) {
      console.warn(`Failed to unregister provider ${provider}:`, error);
    }
  });

  // 重新注册默认服务
  initializeDefaultServices();
} 