import type { Message } from '../../types/chat';
import type {
  ApiModel,
  ApiService,
  ChatCallbacks,
  Provider
} from '../../types/api';
import { useApiStore } from '../../stores/apiStore';
import { useModelStore } from '../../stores/modelStore';

export abstract class BaseApiService implements ApiService {
  protected readonly provider: Provider;

  constructor(provider: Provider) {
    this.provider = provider;
  }

  /**
   * 获取 API 配置
   */
  protected getConfig() {
    const { getProviderConfig } = useApiStore.getState();
    return getProviderConfig(this.provider);
  }

  /**
   * 获取 API 密钥
   */
  protected getApiKey() {
    const { apiKeys } = useModelStore.getState();
    return apiKeys[this.provider];
  }

  /**
   * 更新 API 状态
   */
  protected updateStatus(status: {
    isAvailable?: boolean;
    isLoading?: boolean;
    error?: string | null;
  }) {
    const { setApiStatus } = useApiStore.getState();
    setApiStatus(this.provider, status);
  }

  /**
   * 处理错误
   */
  protected handleError(error: unknown, operation: string): never {
    console.error(`Failed to ${operation}:`, error);
    this.updateStatus({
      isAvailable: false,
      isLoading: false,
      error: error instanceof Error ? error.message : `${operation}失败`
    });
    throw new Error(`${operation}失败: ${error instanceof Error ? error.message : '未知错误'}`);
  }

  /**
   * 检查 API 密钥
   */
  protected checkApiKeyExists(): void {
    const apiKey = this.getApiKey();
    if (!apiKey) {
      throw new Error(`请先配置 ${this.provider.toUpperCase()} API 密钥`);
    }
  }

  /**
   * 处理请求取消
   */
  protected handleAbort() {
    console.log('Request aborted');
    this.updateStatus({ isLoading: false });
  }

  /**
   * 获取模型列表
   */
  abstract getModels(): Promise<ApiModel[]>;

  /**
   * 检查服务是否可用
   */
  abstract checkAvailable(): Promise<boolean>;

  /**
   * 检查 API 密钥是否有效
   */
  abstract checkApiKey?(apiKey: string): Promise<boolean>;

  /**
   * 发送聊天消息
   */
  abstract chat(
    modelId: string,
    messages: Message[],
    callbacks: ChatCallbacks,
    signal?: AbortSignal
  ): Promise<void>;
} 