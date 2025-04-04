export interface ChatMessage {
    role: 'user' | 'assistant' | 'system';
    content: string;
  }
  
  function formatMessages(messages: ChatMessage[]): string {
    let formattedPrompt = '';
    
    // 首先添加系统提示（如果存在）
    const systemMessage = messages.find(msg => msg.role === 'system');
    if (systemMessage) {
      formattedPrompt += `<|im_start|>system\n${systemMessage.content}<|im_end|>\n`;
    }
  
    // 添加对话历史
    for (const msg of messages) {
      if (msg.role !== 'system') {
        formattedPrompt += `<|im_start|>${msg.role}\n${msg.content}<|im_end|>\n`;
      }
    }
  
    return formattedPrompt;
  }
  
  export async function sendMessageToOllama(messages: ChatMessage[]): Promise<string> {
    try {
      // 首先测试 Ollama 服务是否可用
      try {
        await fetch('http://localhost:11434/api/version');
      } catch (error) {
        throw new Error('无法连接到 Ollama 服务，请确保 Ollama 正在运行');
      }
  
      const response = await fetch('http://localhost:11434/api/chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: "deepseek-r1:latest",
          messages: messages.map(msg => ({
            role: msg.role,
            content: msg.content
          })),
          stream: false,
          options: {
            temperature: 0.7,
            top_p: 0.9,
          }
        })
      });
  
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        if (errorData.error?.includes('model not found')) {
          throw new Error('模型未找到，请先运行: ollama pull deepseek-r1:latest');
        }
        throw new Error(`服务器响应错误: ${response.status}`);
      }
  
      const data = await response.json();
      return data.message.content;
    } catch (error) {
      console.error('Error:', error);
      if (error instanceof Error) {
        throw new Error(`Ollama 错误: ${error.message}`);
      }
      throw error;
    }
  }
  
  export async function checkOllamaStatus(): Promise<{
    serviceAvailable: boolean;
    modelAvailable: boolean;
  }> {
    try {
      // 检查服务是否可用
      const versionResponse = await fetch('http://localhost:11434/api/version');
      if (!versionResponse.ok) {
        return {
          serviceAvailable: false,
          modelAvailable: false
        };
      }
  
      // 检查模型是否可用
      const tagsResponse = await fetch('http://localhost:11434/api/tags');
      if (!tagsResponse.ok) {
        return {
          serviceAvailable: true,
          modelAvailable: false
        };
      }
  
      const tags = await tagsResponse.json();
      const hasModel = tags.models?.some((model: any) => model.name === 'deepseek-r1:latest');
  
      return {
        serviceAvailable: true,
        modelAvailable: hasModel
      };
    } catch (error) {
      console.error('Ollama 检查错误:', error);
      return {
        serviceAvailable: false,
        modelAvailable: false
      };
    }
  }
  
  export interface StreamCallbacks {
    onToken?: (token: string) => void;
    onComplete?: (fullMessage: string) => void;
    onError?: (error: Error) => void;
  }
  
  export async function sendMessageToOllamaStream(
    messages: ChatMessage[],
    callbacks: StreamCallbacks
  ): Promise<void> {
    try {
      // 首先测试 Ollama 服务是否可用
      try {
        await fetch('http://localhost:11434/api/version');
      } catch (error) {
        throw new Error('无法连接到 Ollama 服务，请确保 Ollama 正在运行');
      }
  
      const response = await fetch('http://localhost:11434/api/chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: "deepseek-r1:latest",
          messages: messages.map(msg => ({
            role: msg.role,
            content: msg.content
          })),
          stream: true,
          options: {
            temperature: 0.7,
            top_p: 0.9,
          }
        })
      });
  
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        if (errorData.error?.includes('model not found')) {
          throw new Error('模型未找到，请先运行: ollama pull deepseek-r1:latest');
        }
        throw new Error(`服务器响应错误: ${response.status}`);
      }
  
      const reader = response.body?.getReader();
      const decoder = new TextDecoder();
      let fullMessage = '';
  
      if (!reader) {
        throw new Error('无法获取响应流');
      }
  
      try {
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
  
          const chunk = decoder.decode(value);
          const lines = chunk.split('\n').filter(line => line.trim());
          
          for (const line of lines) {
            try {
              const data = JSON.parse(line);
              if (data.message?.content) {
                callbacks.onToken?.(data.message.content);
                fullMessage += data.message.content;
              }
            } catch (e) {
              console.warn('解析响应数据失败:', e);
            }
          }
        }
        
        callbacks.onComplete?.(fullMessage);
      } catch (error) {
        reader.cancel();
        throw error;
      }
    } catch (error) {
      console.error('Stream Error:', error);
      if (error instanceof Error) {
        callbacks.onError?.(error);
      } else {
        callbacks.onError?.(new Error('未知错误'));
      }
    }
  }