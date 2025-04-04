import { useState, useEffect, useCallback } from 'react';
import { sendMessageToOllamaStream, checkOllamaStatus } from '../services/ollamaApi';
import { sendMessageToOpenAI } from '../services/openaiApi';
import { useModelSelection } from './useModelSelection';

export interface Message {
  role: 'user' | 'assistant' | 'system';
  content: string;
}

const SYSTEM_PROMPT = `你是一个有用的AI助手。请用简洁、专业的方式回答问题。`;

export const useChatLLMStream = () => {
  const [messages, setMessages] = useState<Message[]>([
    {
      role: 'system',
      content: SYSTEM_PROMPT
    }
  ]);
  const [isLoading, setIsLoading] = useState(false);
  const [isServiceAvailable, setIsServiceAvailable] = useState(false);
  const [isModelAvailable, setIsModelAvailable] = useState(false);
  const { selectedModel } = useModelSelection();

  const checkStatus = useCallback(async () => {
    if (selectedModel.provider === 'ollama') {
      try {
        const status = await checkOllamaStatus();
        setIsServiceAvailable(status.isServiceAvailable);
        setIsModelAvailable(status.isModelAvailable);
      } catch (error) {
        setIsServiceAvailable(false);
        setIsModelAvailable(false);
      }
    } else {
      // OpenAI 的状态检查在 useModelSelection 中处理
      setIsServiceAvailable(true);
      setIsModelAvailable(true);
    }
  }, [selectedModel]);

  useEffect(() => {
    checkStatus();
    const interval = setInterval(checkStatus, 5000);
    return () => clearInterval(interval);
  }, [checkStatus]);

  const sendMessage = async (content: string, onToken: (token: string) => void) => {
    if (!content.trim()) return;

    setIsLoading(true);
    const newUserMessage: Message = { role: 'user', content };
    const newMessages = [...messages, newUserMessage];
    setMessages(newMessages);

    try {
      let accumulatedResponse = '';
      const processToken = (token: string) => {
        accumulatedResponse += token;
        // 更新助手的回复
        setMessages(prev => {
          const lastMessage = prev[prev.length - 1];
          if (lastMessage.role === 'assistant') {
            // 如果最后一条消息是助手的，更新它
            const updatedMessages = [...prev];
            updatedMessages[updatedMessages.length - 1] = {
              role: 'assistant',
              content: accumulatedResponse
            };
            return updatedMessages;
          } else {
            // 如果最后一条消息不是助手的，添加新的助手消息
            return [...prev, { role: 'assistant', content: accumulatedResponse }];
          }
        });
        // 调用外部的 onToken 回调
        onToken(token);
      };

      if (selectedModel.provider === 'ollama') {
        await sendMessageToOllamaStream(
          newMessages,
          selectedModel.id,
          processToken
        );
      } else {
        await sendMessageToOpenAI(
          newMessages,
          selectedModel.id,
          processToken
        );
      }
    } catch (error) {
      console.error('Error sending message:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const clearMessages = () => {
    setMessages([
      {
        role: 'system',
        content: SYSTEM_PROMPT
      }
    ]);
  };

  const updateSystemPrompt = (prompt: string) => {
    const systemMessage: Message = { role: 'system', content: prompt };
    const userMessages = messages.filter(msg => msg.role !== 'system');
    setMessages([systemMessage, ...userMessages]);
  };

  return {
    messages,
    isLoading,
    sendMessage,
    clearMessages,
    updateSystemPrompt,
    isServiceAvailable,
    isModelAvailable
  };
};