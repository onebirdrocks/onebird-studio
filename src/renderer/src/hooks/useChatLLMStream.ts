import { useState, useEffect, useCallback } from 'react';
import { ChatMessage, sendMessageToOllamaStream, checkOllamaStatus } from '../services/ollamaApi';

interface ChatState {
  messages: ChatMessage[];
  isLoading: boolean;
  error: string | null;
  isServiceAvailable: boolean;
  isModelAvailable: boolean;
}

const SYSTEM_PROMPT = `你是一个AI个人助理。当用户提出专业问题时，请用简洁、专业的方式回答问题。如果用户和你闲聊，请给与足够的情绪价值与陪伴。`;


export function useChatLLMStream() {
  const [state, setState] = useState<ChatState>({
    messages: [
      {
        role: 'system',
        content: SYSTEM_PROMPT
      }
    ],
    isLoading: false,
    error: null,
    isServiceAvailable: false,
    isModelAvailable: false
  });

  const checkStatus = useCallback(async () => {
    try {
      const status = await checkOllamaStatus();
      setState(prev => ({
        ...prev,
        isServiceAvailable: status.serviceAvailable,
        isModelAvailable: status.modelAvailable,
        error: null
      }));
    } catch (error) {
      setState(prev => ({
        ...prev,
        isServiceAvailable: false,
        isModelAvailable: false,
        error: error instanceof Error ? error.message : '检查服务状态时发生错误'
      }));
    }
  }, []);

  useEffect(() => {
    checkStatus();
    const interval = setInterval(checkStatus, 5000);
    return () => clearInterval(interval);
  }, [checkStatus]);

  const sendMessage = useCallback(async (userMessage: string, onToken?: (token: string) => void) => {
    if (!state.isServiceAvailable) {
      setState(prev => ({
        ...prev,
        error: 'Ollama 服务未运行'
      }));
      return;
    }

    if (!state.isModelAvailable) {
      setState(prev => ({
        ...prev,
        error: '模型未安装'
      }));
      return;
    }

    setState(prev => ({
      ...prev,
      messages: [...prev.messages, { role: 'user', content: userMessage }],
      isLoading: true,
      error: null
    }));

    let assistantMessage = '';

    try {
      await sendMessageToOllamaStream(
        [...state.messages, { role: 'user', content: userMessage }],
        {
          onToken: (token) => {
            assistantMessage += token;
            onToken?.(token);
          },
          onComplete: (fullMessage) => {
            setState(prev => ({
              ...prev,
              messages: [...prev.messages, { role: 'assistant', content: fullMessage }],
              isLoading: false
            }));
          },
          onError: (error) => {
            setState(prev => ({
              ...prev,
              error: error.message,
              isLoading: false
            }));
          }
        }
      );
    } catch (error) {
      setState(prev => ({
        ...prev,
        error: error instanceof Error ? error.message : '发送消息时发生错误',
        isLoading: false
      }));
    }
  }, [state.isServiceAvailable, state.isModelAvailable, state.messages]);

  const clearMessages = useCallback(() => {
    setState(prev => ({
      ...prev,
      messages: [
        {
          role: 'system',
          content: SYSTEM_PROMPT
        }
      ],
      error: null
    }));
  }, []);

  const updateSystemPrompt = useCallback((newPrompt: string) => {
    setState(prev => ({
      ...prev,
      messages: [
        {
          role: 'system',
          content: newPrompt
        },
        ...prev.messages.filter(msg => msg.role !== 'system')
      ]
    }));
  }, []);

  return {
    messages: state.messages,
    isLoading: state.isLoading,
    error: state.error,
    isServiceAvailable: state.isServiceAvailable,
    isModelAvailable: state.isModelAvailable,
    sendMessage,
    clearMessages,
    updateSystemPrompt
  };
}