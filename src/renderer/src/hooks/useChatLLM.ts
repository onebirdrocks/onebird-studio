import { useState, useEffect, useCallback } from 'react';
import { Message, sendMessageToOllamaStream, checkOllamaStatus } from '../services/ollamaApi';

interface ChatState {
  messages: Message[];
  isLoading: boolean;
  error: string | null;
  isServiceAvailable: boolean;
  isModelAvailable: boolean;
}

const SYSTEM_PROMPT = `你是一个有用的AI助手。请用简洁、专业的方式回答问题。`;

export function useChatLLM() {
  const [state, setState] = useState<ChatState>({
    messages: [
      {
        role: 'system' as const,
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
        isServiceAvailable: status.isServiceAvailable,
        isModelAvailable: status.isModelAvailable,
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

  const sendMessage = useCallback(async (userMessage: string) => {
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

    const newMessages = [...state.messages, { role: 'user' as const, content: userMessage }];
    setState(prev => ({
      ...prev,
      messages: newMessages,
      isLoading: true,
      error: null
    }));

    try {
      setState(prev => ({
        ...prev,
        messages: [...prev.messages, { role: 'assistant' as const, content: '' }]
      }));

      let accumulatedResponse = '';
      await sendMessageToOllamaStream(
        newMessages,
        'deepseek-r1:latest',
        (token) => {
          accumulatedResponse += token;
          setState(prev => {
            const messages = [...prev.messages];
            messages[messages.length - 1] = {
              role: 'assistant' as const,
              content: accumulatedResponse
            };
            return {
              ...prev,
              messages
            };
          });
        }
      );
      
      setState(prev => ({
        ...prev,
        isLoading: false
      }));
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
          role: 'system' as const,
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
          role: 'system' as const,
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