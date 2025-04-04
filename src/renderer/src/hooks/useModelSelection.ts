import { useState, useEffect } from 'react';
import { getOpenAIModels, initOpenAI } from '../services/openaiApi';

export interface Model {
  id: string;
  name: string;
  provider: 'ollama' | 'openai';
}

const OLLAMA_MODELS = [
  { id: 'deepseek-r1:latest', name: 'DeepSeek R1', provider: 'ollama' as const },
  { id: 'llama2:latest', name: 'Llama 2', provider: 'ollama' as const },
  { id: 'mistral:latest', name: 'Mistral', provider: 'ollama' as const },
  { id: 'codellama:latest', name: 'Code Llama', provider: 'ollama' as const },
  { id: 'qwen:latest', name: 'Qwen', provider: 'ollama' as const },
];

const OPENAI_DEFAULT_MODELS = [
  { id: 'gpt-3.5-turbo', name: 'GPT-3.5 Turbo', provider: 'openai' as const },
  { id: 'gpt-4-1106-preview', name: 'GPT-4 Turbo', provider: 'openai' as const },
];

export const useModelSelection = () => {
  const [selectedModel, setSelectedModel] = useState<Model>(OLLAMA_MODELS[0]);
  const [availableModels, setAvailableModels] = useState<Model[]>(OLLAMA_MODELS);
  const [openAIKey, setOpenAIKey] = useState<string>('');
  const [isLoadingModels, setIsLoadingModels] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadOpenAIModels = async (key: string) => {
    if (!key) {
      setError('请输入 OpenAI API Key');
      return;
    }
    
    setIsLoadingModels(true);
    setError(null);
    
    try {
      initOpenAI(key);
      const openAIModels = await getOpenAIModels();
      const formattedModels = openAIModels.map(model => ({
        id: model.id,
        name: model.name,
        provider: 'openai' as const
      }));
      
      // 如果没有获取到模型列表，使用默认模型
      const modelsToAdd = formattedModels.length > 0 ? formattedModels : OPENAI_DEFAULT_MODELS;
      setAvailableModels([...OLLAMA_MODELS, ...modelsToAdd]);
      
      // 自动选择第一个 OpenAI 模型
      const firstOpenAIModel = modelsToAdd[0];
      if (firstOpenAIModel) {
        setSelectedModel(firstOpenAIModel);
      }
    } catch (err) {
      console.error('Error loading OpenAI models:', err);
      setError(err instanceof Error ? err.message : '加载模型失败');
      setAvailableModels(OLLAMA_MODELS);
      setSelectedModel(OLLAMA_MODELS[0]);
    } finally {
      setIsLoadingModels(false);
    }
  };

  useEffect(() => {
    // 从本地存储加载 OpenAI key
    const savedKey = localStorage.getItem('openai_key');
    if (savedKey) {
      setOpenAIKey(savedKey);
      loadOpenAIModels(savedKey);
    }
  }, []);

  const updateOpenAIKey = async (key: string) => {
    setOpenAIKey(key);
    localStorage.setItem('openai_key', key);
    await loadOpenAIModels(key);
  };

  const handleKeyPress = async (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      await updateOpenAIKey(openAIKey);
    }
  };

  return {
    selectedModel,
    setSelectedModel,
    availableModels,
    openAIKey,
    updateOpenAIKey,
    isLoadingModels,
    error,
    handleKeyPress
  };
}; 