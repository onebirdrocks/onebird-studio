export interface ChatMessage {
    role: 'user' | 'assistant'
    content: string
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
          model: "qwq:latest",  
          //model: "llama2",  // 改用更常见的模型
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
          throw new Error('模型未找到，请先运行: ollama pull llama2');
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
  
  // 添加一个检查服务和模型可用性的函数
  export async function checkOllamaStatus(): Promise<{
    serviceAvailable: boolean;
    modelAvailable: boolean;
  }> {
    try {
      console.log('开始检查 Ollama 状态...');
      const response = await fetch('http://localhost:11434/api/version');
      console.log('收到响应:', {
        status: response.status,
        ok: response.ok
      });
      const data = await response.json();
      console.log('响应数据:', data);
      
      return {
        serviceAvailable: true,
        modelAvailable: true  // 暂时返回 true
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
  
      const response = await fetch('http://localhost:11434/api/generate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: "qwq:latest",
          prompt: messages[messages.length - 1].content,
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
          throw new Error('模型未找到，请先运行: ollama pull llama2');
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
              if (data.response) {
                callbacks.onToken?.(data.response);
                fullMessage += data.response;
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