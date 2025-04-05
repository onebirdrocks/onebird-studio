import axios from 'axios';
import type { Message } from '../types/chat';
import type { ApiModel, ChatCallbacks } from '../types/api';
import { useModelStore } from '../stores/modelStore';
import { useApiStore } from '../stores/apiStore';

/**
 * 获取 DeepSeek 可用的模型列表
 * @returns 返回模型列表
 */
export async function getDeepSeekModels() {
  const { apiKeys } = useModelStore.getState();
  const { getProviderConfig, setApiStatus } = useApiStore.getState();
  const { baseUrl, supportedModels } = getProviderConfig('deepseek');
  const deepseekApiKey = apiKeys['deepseek'];

  if (!deepseekApiKey) {
    throw new Error('请先配置 DeepSeek API 密钥');
  }

  try {
    setApiStatus('deepseek', { isLoading: true, error: null });
    const response = await axios.get(`${baseUrl}/models`, {
      headers: {
        'Authorization': `Bearer ${deepseekApiKey}`
      }
    });

    // 过滤出支持的模型
    const availableModels = supportedModels.filter(supportedModel =>
      response.data.data.some((model: { id: string }) => model.id === supportedModel.id)
    );

    setApiStatus('deepseek', { isAvailable: true, isLoading: false });
    return availableModels.map(model => ({
      id: model.id,
      name: model.name,
      details: {
        maxTokens: model.maxTokens,
        description: model.description
      }
    }));
  } catch (error) {
    console.error('Failed to fetch DeepSeek models:', error);
    setApiStatus('deepseek', {
      isAvailable: false,
      isLoading: false,
      error: error instanceof Error ? error.message : '获取 DeepSeek 模型列表失败'
    });
    if (error instanceof Error) {
      throw new Error(`获取 DeepSeek 模型列表失败: ${error.message}`);
    }
    throw new Error('获取 DeepSeek 模型列表失败');
  }
}

/**
 * 检查 DeepSeek API 密钥是否有效
 * @param apiKey DeepSeek API 密钥
 * @returns 如果 API 密钥有效返回 true，否则返回 false
 */
export async function checkDeepSeekApiKey(apiKey: string): Promise<boolean> {
  const { getProviderConfig, setApiStatus } = useApiStore.getState();
  const { baseUrl } = getProviderConfig('deepseek');

  try {
    const response = await axios.get(`${baseUrl}/models`, {
      headers: {
        'Authorization': `Bearer ${apiKey}`
      }
    });
    const isValid = response.status === 200;
    setApiStatus('deepseek', { isAvailable: isValid });
    return isValid;
  } catch (error) {
    setApiStatus('deepseek', { isAvailable: false });
    return false;
  }
}

/**
 * 与 DeepSeek 模型进行对话
 * @param model 模型名称
 * @param messages 对话历史
 * @param callbacks 回调函数集合
 * @param signal AbortController 的 signal，用于取消请求
 */
export async function chatWithDeepSeek(
  model: string,
  messages: Message[],
  callbacks: ChatCallbacks,
  signal?: AbortSignal
): Promise<void> {
  const { apiKeys } = useModelStore.getState();
  const { getProviderConfig, setApiStatus } = useApiStore.getState();
  const { baseUrl } = getProviderConfig('deepseek');
  const deepseekApiKey = apiKeys['deepseek'];
  const { onToken, onError, onComplete } = callbacks;

  if (!deepseekApiKey) {
    throw new Error('请先配置 DeepSeek API 密钥');
  }

  try {
    setApiStatus('deepseek', { isLoading: true, error: null });
    const response = await fetch(`${baseUrl}/chat/completions`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${deepseekApiKey}`,
        'Content-Type': 'application/json',
        'Accept': 'text/event-stream'
      },
      body: JSON.stringify({
        model,
        messages,
        stream: true,
        temperature: 0.7,
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
      const { done, value } = await reader.read();
      if (done) break;

      const chunk = decoder.decode(value);
      const lines = chunk.split('\n');

      for (const line of lines) {
        if (!line || !line.startsWith('data: ')) continue;
        const data = line.slice(6);
        
        if (data === '[DONE]') {
          onComplete();
          break;
        }

        try {
          const parsed = JSON.parse(data);
          const content = parsed.choices[0]?.delta?.content;
          if (content) {
            onToken(content);
          }
        } catch (e) {
          console.error('Failed to parse DeepSeek response:', e);
          continue;
        }
      }
    }

    setApiStatus('deepseek', { isLoading: false });
    onComplete();
  } catch (error) {
    if (error instanceof Error) {
      if (error.name === 'AbortError') {
        console.log('Chat request aborted');
        setApiStatus('deepseek', { isLoading: false });
        return;
      }
      setApiStatus('deepseek', {
        isLoading: false,
        error: `与 DeepSeek 模型对话失败: ${error.message}`
      });
      onError(error);
    } else {
      setApiStatus('deepseek', {
        isLoading: false,
        error: '与 DeepSeek 模型对话失败'
      });
      onError(new Error('与 DeepSeek 模型对话失败'));
    }
  }
} 