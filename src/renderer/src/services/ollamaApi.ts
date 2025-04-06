import type { Message } from '../types/chat';
import type {
  OllamaListResponse,
  OllamaChatResponse,
  ApiModel,
  ChatCallbacks
} from '../types/api';
import axios, { AxiosError } from 'axios';
import { useApiStore } from '../stores/apiStore';

/**
 * 获取本地 Ollama 可用的模型列表
 * @returns 返回模型列表，每个模型包含 id 和 name
 */
export async function getOllamaModels(): Promise<ApiModel[]> {
  const { getProviderConfig, setApiStatus } = useApiStore.getState();
  const { baseUrl } = getProviderConfig('ollama');

  try {
    setApiStatus('ollama', { isLoading: true, error: null });
    const response = await axios.get<OllamaListResponse>(`${baseUrl}/api/tags`);
    
    const models = response.data.models.map(model => ({
      id: model.name,
      name: model.name,
      details: {
        format: model.details.format,
        family: model.details.family,
        parameterSize: model.details.parameter_size,
        quantizationLevel: model.details.quantization_level
      }
    }));

    setApiStatus('ollama', { isAvailable: true, isLoading: false });
    return models;
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
  const { baseUrl } = getProviderConfig('ollama');
  const { onToken, onError, onComplete } = callbacks;

  try {
    setApiStatus('ollama', { isLoading: true, error: null });
    const response = await fetch(`${baseUrl}/api/chat`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: modelId,
        messages: messages.map(msg => ({
          role: msg.role,
          content: msg.content
        })),
        stream: true
      }),
      signal
    });

    if (!response.ok) {
      const errorData = await response.text();
      throw new Error(`HTTP error! status: ${response.status}, message: ${errorData}`);
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