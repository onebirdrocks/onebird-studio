import type { Message } from '../hooks/useChatLLMStream';
import type { Model } from '../hooks/useModelSelection';

let deepseekKey = '';

export function initDeepSeek(key: string) {
  if (!key.trim().startsWith('dsk-') && !key.trim().startsWith('sk-')) {
    throw new Error('DeepSeek API Key 格式错误，应以 "dsk-" 或 "sk-" 开头');
  }
  deepseekKey = key.trim();
}

export async function getDeepSeekModels(): Promise<Model[]> {
  try {
    const response = await fetch('https://api.deepseek.com/v1/models', {
      headers: {
        'Authorization': `Bearer ${deepseekKey}`
      }
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const data = await response.json();
    console.log('DeepSeek models response:', data);

    const supportedModels = data.data
      .filter((model: any) => model.id.includes('chat'))
      .map((model: any) => ({
        id: model.id,
        name: model.id,
        provider: 'deepseek' as const
      }));

    return supportedModels;
  } catch (error) {
    console.error('Error fetching DeepSeek models:', error);
    throw error;
  }
}

export async function sendMessageToDeepSeekStream(
  messages: Message[],
  modelId: string,
  onToken: (token: string) => void,
  onError: (error: Error) => void,
  onComplete: () => void
): Promise<void> {
  try {
    const response = await fetch('https://api.deepseek.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${deepseekKey}`
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
        if (!line.trim() || !line.startsWith('data: ')) continue;

        const data = line.slice(6);
        if (data === '[DONE]') {
          onComplete();
          return;
        }

        try {
          const parsed = JSON.parse(data);
          const content = parsed.choices[0]?.delta?.content;
          if (content) {
            onToken(content);
          }
        } catch (error) {
          console.error('Error parsing response line:', error);
          continue;
        }
      }
    }
  } catch (error) {
    console.error('Error in sendMessageToDeepSeekStream:', error);
    onError(error instanceof Error ? error : new Error(String(error)));
  }
} 