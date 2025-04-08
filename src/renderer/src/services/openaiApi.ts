import OpenAI from 'openai';
import { useModelStore } from '../stores/modelStore';
import { useApiStore } from '../stores/apiStore';
import type { Message } from '../types/chat';
import type { ApiModel, ChatCallbacks } from '../types/api';

/**
 * 获取 OpenAI 可用的模型列表
 * @returns 返回模型列表
 */
export async function getOpenAIModels(): Promise<ApiModel[]> {
  const { apiKeys } = useModelStore.getState();
  const { getProviderConfig, setApiStatus } = useApiStore.getState();
  const { baseUrl, supportedModels } = getProviderConfig('openai');
  const openaiApiKey = apiKeys['openai'];

  if (!openaiApiKey) {
    throw new Error('请先配置 OpenAI API 密钥');
  }

  try {
    setApiStatus('openai', { isLoading: true, error: null });
    const openai = new OpenAI({
      apiKey: openaiApiKey,
      baseURL: baseUrl,
      dangerouslyAllowBrowser: true // 允许在浏览器环境中使用
    });

    // 获取可用模型列表
    const response = await openai.models.list();
    
    // 过滤出支持的模型
    const availableModels = supportedModels.filter(supportedModel =>
      response.data.some(model => model.id === supportedModel.id)
    );

    setApiStatus('openai', { isAvailable: true, isLoading: false });
    return availableModels.map(model => ({
      id: model.id,
      name: model.name,
      details: {
        maxTokens: model.maxTokens,
        description: model.description
      }
    }));
  } catch (error) {
    console.error('Failed to fetch OpenAI models:', error);
    setApiStatus('openai', {
      isAvailable: false,
      isLoading: false,
      error: error instanceof Error ? error.message : '获取 OpenAI 模型列表失败'
    });
    if (error instanceof Error) {
      throw new Error(`获取 OpenAI 模型列表失败: ${error.message}`);
    }
    throw new Error('获取 OpenAI 模型列表失败');
  }
}

/**
 * 检查 OpenAI API 密钥是否有效
 * @param apiKey OpenAI API 密钥
 * @returns 如果 API 密钥有效返回 true，否则返回 false
 */
export async function checkOpenAIApiKey(apiKey: string): Promise<boolean> {
  const { getProviderConfig, setApiStatus } = useApiStore.getState();
  const { baseUrl } = getProviderConfig('openai');

  try {
    console.log('正在验证 OpenAI API key...', {
      baseUrl,
      keyLength: apiKey?.length
    });

    const openai = new OpenAI({
      apiKey,
      baseURL: baseUrl,
      dangerouslyAllowBrowser: true
    });

    console.log('正在尝试获取 OpenAI 模型列表...');
    await openai.models.list();
    
    console.log('OpenAI API key 验证成功');
    setApiStatus('openai', { isAvailable: true });
    return true;
  } catch (error) {
    console.error('OpenAI API key 验证失败:', {
      error,
      name: error instanceof Error ? error.name : 'Unknown',
      message: error instanceof Error ? error.message : 'Unknown error',
      status: error instanceof Error && 'status' in error ? (error as any).status : 'Unknown',
      response: error instanceof Error && 'response' in error ? (error as any).response : 'No response'
    });
    setApiStatus('openai', { 
      isAvailable: false,
      error: error instanceof Error ? error.message : '验证失败'
    });
    return false;
  }
}

/**
 * 与 OpenAI 模型进行对话
 * @param modelId 模型名称
 * @param messages 对话历史
 * @param callbacks 回调函数集合
 * @param signal AbortController 的 signal，用于取消请求
 */
export async function chatWithOpenAI(
  modelId: string,
  messages: Message[],
  callbacks: ChatCallbacks,
  signal?: AbortSignal
): Promise<void> {
  const { apiKeys } = useModelStore.getState();
  const { getProviderConfig, setApiStatus } = useApiStore.getState();
  const { baseUrl } = getProviderConfig('openai');
  const openaiApiKey = apiKeys['openai'];
  const { onToken, onError, onComplete } = callbacks;

  if (!openaiApiKey) {
    throw new Error('请先配置 OpenAI API 密钥');
  }

  try {
    setApiStatus('openai', { isLoading: true, error: null });
    const openai = new OpenAI({
      apiKey: openaiApiKey,
      baseURL: baseUrl,
      dangerouslyAllowBrowser: true
    });

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

    setApiStatus('openai', { isLoading: false });
    onComplete();
  } catch (error) {
    if (error instanceof Error) {
      if (error.name === 'AbortError') {
        console.log('Chat request aborted');
        setApiStatus('openai', { isLoading: false });
        return;
      }
      setApiStatus('openai', {
        isLoading: false,
        error: `与 OpenAI 模型对话失败: ${error.message}`
      });
      onError(error);
    } else {
      setApiStatus('openai', {
        isLoading: false,
        error: '与 OpenAI 模型对话失败'
      });
      onError(new Error('与 OpenAI 模型对话失败'));
    }
  }
} 