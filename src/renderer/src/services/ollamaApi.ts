import type { Message } from '../hooks/useChatLLMStream';
import type { Model } from '../hooks/useModelSelection';

interface OllamaApiModel {
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

interface OllamaApiResponse {
  models: OllamaApiModel[];
}

interface OllamaChatResponse {
  message: {
    role: string;
    content: string;
  };
  done: boolean;
}

export async function checkOllamaStatus(): Promise<boolean> {
  try {
    const response = await fetch('http://localhost:11434/api/tags');
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    return true;
  } catch (error) {
    console.error('Error checking Ollama status:', error);
    return false;
  }
}

export async function getOllamaModels(): Promise<Model[]> {
  try {
    const response = await fetch('http://localhost:11434/api/tags');
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    const data: OllamaApiResponse = await response.json();
    
    return data.models.map(model => ({
      id: model.name,
      name: model.name.split(':')[0],
      provider: 'ollama' as const
    }));
  } catch (error) {
    console.error('Error fetching Ollama models:', error);
    throw error;
  }
}

export async function sendMessageToOllamaStream(
  messages: Message[],
  modelId: string,
  onToken: (token: string) => void,
  onError: (error: Error) => void,
  onComplete: () => void
): Promise<void> {
  try {
    const response = await fetch('http://localhost:11434/api/chat', {
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
            return;
          }
        } catch (error) {
          console.error('Error parsing response line:', error);
          continue;
        }
      }
    }
  } catch (error) {
    console.error('Error in sendMessageToOllamaStream:', error);
    onError(error instanceof Error ? error : new Error(String(error)));
  }
} 