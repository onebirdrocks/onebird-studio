import OpenAI from 'openai';
import { useModelStore } from '../stores/modelStore';
import { useApiStore } from '../stores/apiStore';

// OpenAI 支持的模型列表
const SUPPORTED_MODELS = [
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
];

/**
 * 获取 OpenAI 可用的模型列表
 * @returns 返回模型列表
 */
export async function getOpenAIModels() {
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
    const openai = new OpenAI({
      apiKey,
      baseURL: baseUrl,
      dangerouslyAllowBrowser: true
    });
    await openai.models.list();
    setApiStatus('openai', { isAvailable: true });
    return true;
  } catch (error) {
    setApiStatus('openai', { isAvailable: false });
    return false;
  }
}

/**
 * 与 OpenAI 模型进行对话
 * @param model 模型名称
 * @param messages 对话历史
 * @param onMessage 接收消息的回调函数
 * @param signal AbortController 的 signal，用于取消请求
 */
export async function chatWithOpenAI(
  model: string,
  messages: Array<{ role: 'user' | 'assistant' | 'system'; content: string }>,
  onMessage: (message: string) => void,
  signal?: AbortSignal
) {
  const { apiKeys } = useModelStore.getState();
  const { getProviderConfig, setApiStatus } = useApiStore.getState();
  const { baseUrl } = getProviderConfig('openai');
  const openaiApiKey = apiKeys['openai'];

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
      model,
      messages,
      stream: true,
      temperature: 0.7,
    }, { signal });

    for await (const chunk of stream) {
      const content = chunk.choices[0]?.delta?.content;
      if (content) {
        onMessage(content);
      }
    }

    setApiStatus('openai', { isLoading: false });
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
      throw new Error(`与 OpenAI 模型对话失败: ${error.message}`);
    }
    setApiStatus('openai', {
      isLoading: false,
      error: '与 OpenAI 模型对话失败'
    });
    throw new Error('与 OpenAI 模型对话失败');
  }
} 