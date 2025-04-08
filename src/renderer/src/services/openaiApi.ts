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

  if (!openaiApiKey || openaiApiKey.trim() === '') {
    setApiStatus('openai', { 
      isAvailable: false, 
      error: '请先配置 OpenAI API 密钥' 
    });
    throw new Error('请先配置 OpenAI API 密钥');
  }

  try {
    setApiStatus('openai', { isLoading: true, error: null });
    const openai = new OpenAI({
      apiKey: openaiApiKey,
      baseURL: baseUrl,
      dangerouslyAllowBrowser: true
    });

    console.log('正在获取 OpenAI 模型列表...');
    const response = await openai.models.list();
    
    if (!response.data || response.data.length === 0) {
      setApiStatus('openai', { 
        isAvailable: false, 
        isLoading: false,
        error: '未能获取到任何可用模型' 
      });
      throw new Error('未能获取到任何可用模型');
    }

    // 过滤出支持的模型
    const availableModels = supportedModels.filter(supportedModel =>
      response.data.some(model => model.id === supportedModel.id)
    );

    if (availableModels.length === 0) {
      setApiStatus('openai', { 
        isAvailable: false, 
        isLoading: false,
        error: '没有找到任何支持的模型' 
      });
      throw new Error('没有找到任何支持的模型');
    }

    setApiStatus('openai', { 
      isAvailable: true, 
      isLoading: false,
      error: null 
    });

    return availableModels.map(model => ({
      id: model.id,
      name: model.name,
      details: {
        maxTokens: model.maxTokens,
        description: model.description
      }
    }));
  } catch (error) {
    console.error('获取 OpenAI 模型列表失败:', {
      error,
      name: error instanceof Error ? error.name : 'Unknown',
      message: error instanceof Error ? error.message : 'Unknown error',
      status: error instanceof Error && 'status' in error ? (error as any).status : 'Unknown'
    });

    let errorMessage = '获取模型列表失败';
    if (error instanceof Error) {
      if ((error as any).status === 401) {
        errorMessage = 'API 密钥无效';
      } else if ((error as any).status === 403) {
        errorMessage = 'API 密钥权限不足';
      } else if (error.message.includes('fetch')) {
        errorMessage = '网络连接失败，请检查网络或 API 代理设置';
      } else {
        errorMessage = `获取模型列表失败: ${error.message}`;
      }
    }

    setApiStatus('openai', {
      isAvailable: false,
      isLoading: false,
      error: errorMessage
    });

    throw new Error(errorMessage);
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

  if (!apiKey || apiKey.trim() === '') {
    console.error('OpenAI API key 为空');
    setApiStatus('openai', { 
      isAvailable: false,
      error: 'API 密钥不能为空'
    });
    return false;
  }

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
    setApiStatus('openai', { isAvailable: true, error: null });
    return true;
  } catch (error) {
    console.error('OpenAI API key 验证失败:', {
      error,
      name: error instanceof Error ? error.name : 'Unknown',
      message: error instanceof Error ? error.message : 'Unknown error',
      status: error instanceof Error && 'status' in error ? (error as any).status : 'Unknown',
      response: error instanceof Error && 'response' in error ? (error as any).response : 'No response'
    });

    let errorMessage = '验证失败';
    if (error instanceof Error) {
      if ((error as any).status === 401) {
        errorMessage = 'API 密钥无效';
      } else if ((error as any).status === 403) {
        errorMessage = 'API 密钥权限不足';
      } else if (error.message.includes('fetch')) {
        errorMessage = '网络连接失败，请检查网络或 API 代理设置';
      }
    }

    setApiStatus('openai', { 
      isAvailable: false,
      error: errorMessage
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