import { Model } from '../hooks/useModelSelection';

export interface Message {
  role: 'user' | 'assistant' | 'system';
  content: string;
}

const OLLAMA_API_BASE_URL = 'http://localhost:11434';

interface OllamaResponse {
  message: {
    role: string;
    content: string;
  };
  done: boolean;
}

interface OllamaStatusResponse {
  isServiceAvailable: boolean;
  isModelAvailable: boolean;
}

export const checkOllamaStatus = async (modelId: string): Promise<OllamaStatusResponse> => {
  console.log('Checking Ollama status for model:', modelId);
  try {
    // 检查服务是否可用
    const versionResponse = await fetch(`${OLLAMA_API_BASE_URL}/api/version`);
    if (!versionResponse.ok) {
      console.log('Ollama service not available:', versionResponse.status);
      return {
        isServiceAvailable: false,
        isModelAvailable: false
      };
    }

    // 检查模型是否可用
    const modelResponse = await fetch(`${OLLAMA_API_BASE_URL}/api/show`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ name: modelId })
    });

    const isModelAvailable = modelResponse.ok;
    console.log('Ollama model status:', { modelId, isAvailable: isModelAvailable });

    return {
      isServiceAvailable: true,
      isModelAvailable
    };
  } catch (error) {
    console.error('Error checking Ollama status:', error);
    return {
      isServiceAvailable: false,
      isModelAvailable: false
    };
  }
};

export const sendMessageToOllamaStream = async (
  messages: Message[],
  modelId: string,
  onToken: (token: string) => void
) => {
  console.log('Sending message to Ollama:', { modelId, messages });
  const response = await fetch(`${OLLAMA_API_BASE_URL}/api/chat`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: modelId,
      messages: messages,
      stream: true
    })
  });

  if (!response.ok) {
    const errorText = await response.text();
    console.error('Ollama API error:', { status: response.status, error: errorText });
    throw new Error(`Ollama API error: ${response.status} - ${errorText}`);
  }

  const reader = response.body?.getReader();
  const decoder = new TextDecoder();

  if (!reader) {
    throw new Error('No reader available');
  }

  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      const chunk = decoder.decode(value);
      const lines = chunk.split('\n');

      for (const line of lines) {
        if (line.trim() === '') continue;

        try {
          const data: OllamaResponse = JSON.parse(line);
          if (data.message?.content) {
            onToken(data.message.content);
          }
        } catch (error) {
          console.error('Error parsing Ollama response:', error);
        }
      }
    }
  } finally {
    reader.releaseLock();
  }
};

export interface OllamaModel {
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

export const getOllamaModels = async (): Promise<Model[]> => {
  try {
    console.log('Fetching Ollama models from API...');
    const response = await fetch(`${OLLAMA_API_BASE_URL}/api/tags`);
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    const data = await response.json();
    console.log('Raw Ollama API response:', data);
    
    if (!data.models || !Array.isArray(data.models)) {
      console.error('Invalid response format from Ollama API:', data);
      return [];
    }

    const models: Model[] = data.models.map(model => ({
      id: model.name,
      name: model.name.split(':')[0].split('/').pop()?.replace(/^\w/, c => c.toUpperCase()) || model.name,
      provider: 'ollama' as const
    }));

    console.log('Processed Ollama models:', models);
    return models;
  } catch (error) {
    console.error('Error fetching Ollama models:', error);
    return [];
  }
}; 