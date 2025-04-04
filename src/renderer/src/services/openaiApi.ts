import type { Message } from '../hooks/useChatLLMStream';
import type { Model } from '../hooks/useModelSelection';

let openAIKey = '';

export function initOpenAI(key: string) {
  openAIKey = key;
}

export async function getOpenAIModels(): Promise<Model[]> {
  try {
    const response = await fetch('https://api.openai.com/v1/models', {
      headers: {
        'Authorization': `Bearer ${openAIKey}`
      }
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const data = await response.json();
    const supportedModels = data.data
      .filter((model: any) => model.id.startsWith('gpt'))
      .map((model: any) => ({
        id: model.id,
        name: model.id,
        provider: 'openai' as const
      }));

    return supportedModels;
  } catch (error) {
    console.error('Error fetching OpenAI models:', error);
    throw error;
  }
}

export async function sendMessageToOpenAIStream(
  messages: Message[],
  modelId: string,
  onToken: (token: string) => void,
  onError: (error: Error) => void,
  onComplete: () => void
): Promise<void> {
  try {
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${openAIKey}`
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
    console.error('Error in sendMessageToOpenAIStream:', error);
    onError(error instanceof Error ? error : new Error(String(error)));
  }
} 