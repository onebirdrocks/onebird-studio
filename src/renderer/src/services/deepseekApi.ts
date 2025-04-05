import axios from 'axios';
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
 * @param onMessage 接收消息的回调函数
 * @param signal AbortController 的 signal，用于取消请求
 */
export async function chatWithDeepSeek(
  model: string,
  messages: Array<{ role: 'user' | 'assistant' | 'system'; content: string }>,
  onMessage: (message: string) => void,
  signal?: AbortSignal
) {
  const { apiKeys } = useModelStore.getState();
  const { getProviderConfig, setApiStatus } = useApiStore.getState();
  const { baseUrl } = getProviderConfig('deepseek');
  const deepseekApiKey = apiKeys['deepseek'];

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
        
        if (data === '[DONE]') break;

        try {
          const parsed = JSON.parse(data);
          const content = parsed.choices[0]?.delta?.content;
          if (content) {
            onMessage(content);
          }
        } catch (e) {
          console.error('Failed to parse DeepSeek response:', e);
        }
      }
    }

    setApiStatus('deepseek', { isLoading: false });
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
      throw new Error(`与 DeepSeek 模型对话失败: ${error.message}`);
    }
    setApiStatus('deepseek', {
      isLoading: false,
      error: '与 DeepSeek 模型对话失败'
    });
    throw new Error('与 DeepSeek 模型对话失败');
  }
} 