import { useState, useCallback, useEffect } from 'react';
import { checkOllamaStatus, sendMessageToOllamaStream } from '../services/ollamaApi';
import { sendMessageToOpenAIStream } from '../services/openaiApi';
import { sendMessageToDeepSeekStream } from '../services/deepseekApi';
import { useModelSelection } from './useModelSelection';

export interface Message {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

export function useChatLLMStream() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isServiceAvailable, setIsServiceAvailable] = useState(true);
  const [isModelAvailable, setIsModelAvailable] = useState(true);
  const { selectedModel } = useModelSelection();

  const checkStatus = useCallback(async () => {
    try {
      console.log('Checking service status for provider:', selectedModel?.provider);
      if (!selectedModel) {
        setIsServiceAvailable(false);
        setIsModelAvailable(false);
        return;
      }

      switch (selectedModel.provider) {
        case 'ollama':
          const isOllamaAvailable = await checkOllamaStatus();
          setIsServiceAvailable(isOllamaAvailable);
          setIsModelAvailable(isOllamaAvailable);
          break;
        case 'openai':
        case 'deepseek':
          // 对于云服务，我们假设服务总是可用的
          setIsServiceAvailable(true);
          setIsModelAvailable(true);
          break;
        default:
          setIsServiceAvailable(false);
          setIsModelAvailable(false);
      }
    } catch (error) {
      console.error('Error checking service status:', error);
      setIsServiceAvailable(false);
      setIsModelAvailable(false);
    }
  }, [selectedModel]);

  const initializeChat = useCallback(() => {
    setMessages([]);
    setIsLoading(false);
    setIsServiceAvailable(true);
    setIsModelAvailable(true);
  }, []);

  const sendMessage = useCallback(async (content: string) => {
    if (!selectedModel) {
      console.error('No model selected');
      return;
    }

    console.log('Sending message with model:', selectedModel);
    setIsLoading(true);

    const newMessage: Message = {
      role: 'user',
      content
    };

    setMessages(prev => [...prev, newMessage]);

    let streamingMessage = '';
    const onToken = (token: string) => {
      streamingMessage += token;
      setMessages(prev => {
        const newMessages = [...prev];
        const lastMessage = newMessages[newMessages.length - 1];
        if (lastMessage?.role === 'assistant') {
          lastMessage.content = streamingMessage;
        } else {
          newMessages.push({
            role: 'assistant',
            content: streamingMessage
          });
        }
        return newMessages;
      });
    };

    const onError = (error: Error) => {
      console.error('Error in message stream:', error);
      setMessages(prev => [
        ...prev,
        {
          role: 'assistant',
          content: `错误: ${error.message}`
        }
      ]);
      setIsLoading(false);
    };

    const onComplete = () => {
      console.log('Message stream completed');
      setIsLoading(false);
    };

    try {
      const allMessages = [...messages, newMessage];
      
      switch (selectedModel.provider) {
        case 'ollama':
          await sendMessageToOllamaStream(
            allMessages,
            selectedModel.id,
            onToken,
            onError,
            onComplete
          );
          break;
        case 'openai':
          await sendMessageToOpenAIStream(
            allMessages,
            selectedModel.id,
            onToken,
            onError,
            onComplete
          );
          break;
        case 'deepseek':
          await sendMessageToDeepSeekStream(
            allMessages,
            selectedModel.id,
            onToken,
            onError,
            onComplete
          );
          break;
        default:
          throw new Error(`不支持的提供商: ${selectedModel.provider}`);
      }
    } catch (error) {
      console.error('Error sending message:', error);
      onError(error instanceof Error ? error : new Error(String(error)));
    }
  }, [messages, selectedModel]);

  // 初始化时检查服务状态
  useEffect(() => {
    checkStatus();
  }, [checkStatus]);

  // 当选中的模型改变时重新检查状态
  useEffect(() => {
    checkStatus();
  }, [selectedModel, checkStatus]);

  return {
    messages,
    isLoading,
    sendMessage,
    isServiceAvailable,
    isModelAvailable,
    clearMessages: initializeChat,
    checkStatus,
    initializeChat
  };
}