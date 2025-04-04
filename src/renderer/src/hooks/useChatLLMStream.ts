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
  const [isInitialized, setIsInitialized] = useState(false);
  const [currentModelId, setCurrentModelId] = useState<string | null>(null);
  const { selectedModel } = useModelSelection();

  const checkStatus = useCallback(async () => {
    if (!isInitialized) return;
    
    console.log('Checking status for model:', selectedModel);
    if (selectedModel.provider === 'ollama') {
      try {
        const status = await checkOllamaStatus(selectedModel.id);
        console.log('Ollama status:', status);
        setIsServiceAvailable(status.isServiceAvailable);
        setIsModelAvailable(status.isModelAvailable);
      } catch (error) {
        console.error('Error checking Ollama status:', error);
        setIsServiceAvailable(false);
        setIsModelAvailable(false);
      }
    } else {
      // OpenAI 的状态检查在 useModelSelection 中处理
      setIsServiceAvailable(true);
      setIsModelAvailable(true);
    }
  }, [selectedModel, isInitialized]);

  useEffect(() => {
    if (!isInitialized) return;
    
    console.log('Model changed in useChatLLMStream:', selectedModel);
    setCurrentModelId(selectedModel.id);
    checkStatus();
    const interval = setInterval(checkStatus, 5000);
    return () => clearInterval(interval);
  }, [checkStatus, selectedModel, isInitialized]);

  const sendMessage = async (content: string, onToken: (token: string) => void) => {
    if (!content.trim()) return;
    if (!isInitialized) {
      setIsInitialized(true);
      await checkStatus();
    }

    setIsLoading(true);
    const newUserMessage: Message = { role: 'user', content };
    const newMessages = [...messages, newUserMessage];
    setMessages(newMessages);

    try {
      let accumulatedResponse = '';
      const processToken = (token: string) => {
        accumulatedResponse += token;
        setMessages(prev => {
          const lastMessage = prev[prev.length - 1];
          if (lastMessage.role === 'assistant') {
            const updatedMessages = [...prev];
            updatedMessages[updatedMessages.length - 1] = {
              role: 'assistant',
              content: accumulatedResponse
            };
            return updatedMessages;
          } else {
            return [...prev, { role: 'assistant', content: accumulatedResponse }];
          }
        });
        onToken(token);
      };

      // 使用当前选中的模型
      const modelToUse = currentModelId || selectedModel.id;
      console.log('Sending message using model:', { provider: selectedModel.provider, id: modelToUse });

      if (selectedModel.provider === 'openai') {
        console.log('Using OpenAI API with model:', modelToUse);
        await sendMessageToOpenAI(
          newMessages,
          modelToUse,
          processToken
        );
      } else {
        console.log('Using Ollama API with model:', modelToUse);
        await sendMessageToOllamaStream(
          newMessages,
          modelToUse,
          processToken
        );
      }
    } catch (error) {
      console.error('Error sending message:', error);
      // 如果发送失败，移除最后一条消息
      setMessages(prev => prev.slice(0, -1));
    } finally {
      setIsLoading(false);
    }
  };

  const clearMessages = useCallback(() => {
    console.log('Clearing messages');
    setMessages([
      {
        role: 'system',
        content: SYSTEM_PROMPT
      }
    ]);
  }, []);

  const updateSystemPrompt = useCallback((prompt: string) => {
    console.log('Updating system prompt:', prompt);
    const systemMessage: Message = { role: 'system', content: prompt };
    setMessages(prev => {
      const userMessages = prev.filter(msg => msg.role !== 'system');
      return [systemMessage, ...userMessages];
    });
  }, []);

  const initializeChat = useCallback(() => {
    console.log('Initializing chat with model:', selectedModel);
    setIsInitialized(true);
    setCurrentModelId(selectedModel.id);
    checkStatus();
  }, [checkStatus, selectedModel]);

  return {
    messages,
    isLoading,
    sendMessage,
    clearMessages,
    updateSystemPrompt,
    isServiceAvailable,
    isModelAvailable,
    checkStatus,
    initializeChat
  };
};