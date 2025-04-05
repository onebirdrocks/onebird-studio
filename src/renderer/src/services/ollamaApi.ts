import type { Message } from '../types/chat';
import type { Model } from '../stores/modelStore';
import axios, { AxiosError } from 'axios';
import { useApiStore } from '../stores/apiStore';

interface OllamaModel {
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

interface OllamaListResponse {
  models: OllamaModel[];
}

interface OllamaChatResponse {
  message: {
    role: string;
    content: string;
  };
  done: boolean;
}

/**
 * 获取本地 Ollama 可用的模型列表
 * @returns 返回模型列表，每个模型包含 id 和 name
 */
export async function getOllamaModels() {
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
 * @param model 模型名称
 * @param messages 对话历史
 * @param onMessage 接收消息的回调函数
 * @param signal AbortController 的 signal，用于取消请求
 */
export async function chatWithOllama(
  model: string,
  messages: Array<{ role: 'user' | 'assistant' | 'system'; content: string }>,
  onMessage: (message: string) => void,
  signal?: AbortSignal
) {
  const { getProviderConfig, setApiStatus } = useApiStore.getState();
  const { baseUrl } = getProviderConfig('ollama');

  try {
    setApiStatus('ollama', { isLoading: true, error: null });
    const response = await fetch(`${baseUrl}/api/chat`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model,
        messages,
        stream: true
      }),
      signal
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    if (!response.body) {
      throw new Error('Response body is null');
    }

    const reader = response.body.getReader();
    const decoder = new TextDecoder();

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      const chunk = decoder.decode(value);
      const lines = chunk.split('\n');

      for (const line of lines) {
        if (!line) continue;
        try {
          const data = JSON.parse(line);
          if (data.message?.content) {
            onMessage(data.message.content);
          }
        } catch (e) {
          console.error('Failed to parse Ollama response:', e);
        }
      }
    }

    setApiStatus('ollama', { isLoading: false });
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
      throw new Error(`与 Ollama 模型对话失败: ${error.message}`);
    }
    setApiStatus('ollama', {
      isLoading: false,
      error: '与 Ollama 模型对话失败'
    });
    throw new Error('与 Ollama 模型对话失败');
  }
}

export async function sendMessageToOllamaStream(
  messages: Message[],
  modelId: string,
  onToken: (token: string) => void,
  onError: (error: Error) => void,
  onComplete: () => void
): Promise<void> {
  const { getProviderConfig, setApiStatus } = useApiStore.getState();
  const { baseUrl } = getProviderConfig('ollama');

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
      })
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
  } catch (error) {
    setApiStatus('ollama', {
      isLoading: false,
      error: error instanceof Error ? error.message : '与 Ollama 模型对话失败'
    });
    if (error instanceof Error) {
      onError(error);
    } else {
      onError(new Error('与 Ollama 模型对话失败'));
    }
  }
} 