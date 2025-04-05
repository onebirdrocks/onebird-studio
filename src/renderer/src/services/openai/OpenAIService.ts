import type { Message } from '../../types/chat';
import type { ApiModel, ChatCallbacks } from '../../types/api';
import OpenAI from 'openai';
import { BaseApiService } from '../base/BaseApiService';

export class OpenAIService extends BaseApiService {
  constructor() {
    super('openai');
  }

  /**
   * 创建 OpenAI 客户端实例
   */
  private createClient(apiKey?: string) {
    const { baseUrl } = this.getConfig();
    return new OpenAI({
      apiKey: apiKey || this.getApiKey(),
      baseURL: baseUrl,
      dangerouslyAllowBrowser: true
    });
  }

  /**
   * 获取 OpenAI 可用的模型列表
   */
  async getModels(): Promise<ApiModel[]> {
    this.checkApiKeyExists();
    const { supportedModels } = this.getConfig();

    try {
      this.updateStatus({ isLoading: true, error: null });
      const openai = this.createClient();
      const response = await openai.models.list();
      
      // 过滤出支持的模型
      const availableModels = supportedModels.filter(supportedModel =>
        response.data.some(model => model.id === supportedModel.id)
      );

      this.updateStatus({ isAvailable: true, isLoading: false });
      return availableModels.map(model => ({
        id: model.id,
        name: model.name,
        details: {
          maxTokens: model.maxTokens,
          description: model.description
        }
      }));
    } catch (error) {
      return this.handleError(error, '获取 OpenAI 模型列表');
    }
  }

  /**
   * 检查 OpenAI 服务是否可用
   */
  async checkAvailable(): Promise<boolean> {
    const apiKey = this.getApiKey();
    if (!apiKey) return false;
    return this.checkApiKey(apiKey);
  }

  /**
   * 检查 API 密钥是否有效
   */
  async checkApiKey(apiKey: string): Promise<boolean> {
    try {
      const openai = this.createClient(apiKey);
      await openai.models.list();
      this.updateStatus({ isAvailable: true });
      return true;
    } catch (error) {
      this.updateStatus({ isAvailable: false });
      return false;
    }
  }

  /**
   * 与 OpenAI 模型进行对话
   */
  async chat(
    modelId: string,
    messages: Message[],
    callbacks: ChatCallbacks,
    signal?: AbortSignal
  ): Promise<void> {
    this.checkApiKeyExists();
    const { onToken, onError, onComplete } = callbacks;

    try {
      this.updateStatus({ isLoading: true, error: null });
      const openai = this.createClient();

      const stream = await openai.chat.completions.create({
        model: modelId,
        messages,
        stream: true,
        temperature: 0.7,
      }, { signal });

      for await (const chunk of stream) {
        const content = chunk.choices[0]?.delta?.content;
        if (content) {
          onToken(content);
        }
      }

      this.updateStatus({ isLoading: false });
      onComplete();
    } catch (error) {
      if (error instanceof Error && error.name === 'AbortError') {
        this.handleAbort();
        return;
      }

      this.updateStatus({
        isLoading: false,
        error: error instanceof Error ? error.message : '与 OpenAI 模型对话失败'
      });

      onError(error instanceof Error ? error : new Error('与 OpenAI 模型对话失败'));
    }
  }
} 