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

export const checkOllamaStatus = async (): Promise<OllamaStatusResponse> => {
  try {
    // 检查服务是否可用
    const versionResponse = await fetch(`${OLLAMA_API_BASE_URL}/api/version`);
    if (!versionResponse.ok) {
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
      body: JSON.stringify({ name: 'deepseek-r1:latest' })
    });

    return {
      isServiceAvailable: true,
      isModelAvailable: modelResponse.ok
    };
  } catch (error) {
    console.error('Ollama 检查错误:', error);
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
    throw new Error(`HTTP error! status: ${response.status}`);
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
          console.error('Error parsing JSON:', error);
        }
      }
    }
  } finally {
    reader.releaseLock();
  }
}; 