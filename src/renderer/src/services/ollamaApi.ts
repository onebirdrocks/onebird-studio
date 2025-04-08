import type { Message } from '../types/chat';
import type {
  OllamaListResponse,
  OllamaChatResponse,
  ApiModel,
  ChatCallbacks
} from '../types/api';
import axios, { AxiosError } from 'axios';
import { useApiStore } from '../stores/apiStore';

// 根据环境确定基础 URL
const BASE_URL = process.env.NODE_ENV === 'development' 
  ? '/ollama'  // 开发环境使用代理
  : 'http://localhost:11434'  // 生产环境直接连接

const ollamaApi = axios.create({
  baseURL: BASE_URL,
  timeout: 10000
})

export interface OllamaModel {
  name: string
  modified_at: string
  size: number
  digest: string
  details: {
    format: string
    family: string
    parameter_size: string
    quantization_level: string
  }
}

/**
 * 获取本地 Ollama 可用的模型列表
 * @returns 返回模型列表，每个模型包含 id 和 name
 */
export async function getOllamaModels(): Promise<OllamaModel[]> {
  const { getProviderConfig, setApiStatus } = useApiStore.getState();

  try {
    setApiStatus('ollama', { isLoading: true, error: null });
    const response = await ollamaApi.get('/api/tags');
    
    if (response.data && Array.isArray(response.data.models)) {
      const models = response.data.models.map(model => ({
        name: model.name,
        modified_at: model.modified_at,
        size: model.size,
        digest: model.digest,
        details: {
          format: model.details.format,
          family: model.details.family,
          parameter_size: model.details.parameter_size,
          quantization_level: model.details.quantization_level
        }
      }));

      setApiStatus('ollama', { isAvailable: true, isLoading: false });
      return models;
    }
    throw new Error('无效的响应格式');
  } catch (error) {
    console.error('Failed to fetch Ollama models:', error);
    setApiStatus('ollama', {
      isAvailable: false,
      isLoading: false,
      error: error instanceof AxiosError ? error.message : '无法连接到 Ollama 服务'
    });
    if (error instanceof AxiosError) {
      throw new Error(`无法连接到 Ollama 服务: ${error.message}`);
    }
    throw new Error('无法连接到 Ollama 服务，请确保 Ollama 已启动');
  }
}

/**
 * 检查 Ollama 服务是否可用
 * @returns 如果服务可用返回 true，否则返回 false
 */
export async function checkOllamaAvailable(): Promise<boolean> {
  const { getProviderConfig, setApiStatus } = useApiStore.getState();
  const { baseUrl } = getProviderConfig('ollama');

  try {
    await axios.get(`${baseUrl}/api/tags`);
    setApiStatus('ollama', { isAvailable: true });
    return true;
  } catch (error) {
    setApiStatus('ollama', { isAvailable: false });
    return false;
  }
}

/**
 * 与 Ollama 模型进行对话
 * @param modelId 模型名称
 * @param messages 对话历史
 * @param callbacks 回调函数集合
 * @param signal AbortController 的 signal，用于取消请求
 */
export async function chatWithOllama(
  modelId: string,
  messages: Message[],
  callbacks: ChatCallbacks,
  signal?: AbortSignal
): Promise<void> {
  const { getProviderConfig, setApiStatus } = useApiStore.getState();
  const { onToken, onError, onComplete } = callbacks;

  try {
    // 检查模型ID
    if (!modelId || typeof modelId !== 'string' || modelId.trim() === '') {
      throw new Error('模型ID不能为空');
    }

    setApiStatus('ollama', { isLoading: true, error: null });
    
    // 转换消息格式，确保系统消息被正确处理
    const formattedMessages = messages.map(msg => ({
      role: msg.role === 'system' ? 'system' : msg.role === 'assistant' ? 'assistant' : 'user',
      content: msg.content
    }));

    const requestBody = {
      model: modelId.trim(),
      messages: formattedMessages,
      stream: true
    };

    // 添加详细的调试日志
    console.log('Ollama 请求详情:', {
      modelId: modelId,
      url: `${BASE_URL}/api/chat`,
      requestBody: JSON.stringify(requestBody, null, 2),
      messagesCount: messages.length,
      firstMessage: messages[0]?.content.substring(0, 100) // 只显示第一条消息的前100个字符
    });

    const response = await fetch(`${BASE_URL}/api/chat`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(requestBody),
      signal
    });

    if (!response.ok) {
      const errorData = await response.text();
      const errorInfo = {
        status: response.status,
        statusText: response.statusText,
        errorData,
        requestBody: requestBody
      };
      console.error('Ollama API 错误详情:', errorInfo);
      throw new Error(`Ollama API 错误: ${errorData}`);
    }

    if (!response.body) {
      throw new Error('Response body is null');
    }

    const reader = response.body.getReader();
    const decoder = new TextDecoder();

    while (true) {
      const { value, done } = await reader.read();
      if (done) break;

      const chunk = decoder.decode(value);
      const lines = chunk.split('\n');

      for (const line of lines) {
        if (!line.trim()) continue;

        try {
          const data: OllamaChatResponse = JSON.parse(line);
          if (data.message?.content) {
            onToken(data.message.content);
          }
          if (data.done) {
            onComplete();
            setApiStatus('ollama', { isLoading: false });
            return;
          }
        } catch (error) {
          console.error('Error parsing response line:', error);
          continue;
        }
      }
    }

    setApiStatus('ollama', { isLoading: false });
    onComplete();
  } catch (error) {
    if (error instanceof Error) {
      if (error.name === 'AbortError') {
        console.log('Chat request aborted');
        setApiStatus('ollama', { isLoading: false });
        return;
      }
      setApiStatus('ollama', {
        isLoading: false,
        error: `与 Ollama 模型对话失败: ${error.message}`
      });
      onError(error);
    } else {
      setApiStatus('ollama', {
        isLoading: false,
        error: '与 Ollama 模型对话失败'
      });
      onError(new Error('与 Ollama 模型对话失败'));
    }
  }
} 