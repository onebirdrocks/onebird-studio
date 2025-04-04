import { useState, useEffect, useCallback } from 'react';
import { getOpenAIModels, initOpenAI } from '../services/openaiApi';
import { getOllamaModels } from '../services/ollamaApi';

export interface Model {
  id: string;
  name: string;
  provider: 'ollama' | 'openai';
}

// 默认模型列表，用于加载失败时的回退
const DEFAULT_OLLAMA_MODELS = [
  { id: 'deepseek-r1:latest', name: 'DeepSeek R1', provider: 'ollama' as const },
  { id: 'llama2:latest', name: 'Llama 2', provider: 'ollama' as const },
  { id: 'mistral:latest', name: 'Mistral', provider: 'ollama' as const },
];

const OPENAI_DEFAULT_MODELS = [
  { id: 'gpt-3.5-turbo', name: 'GPT-3.5 Turbo', provider: 'openai' as const },
  { id: 'gpt-4-1106-preview', name: 'GPT-4 Turbo', provider: 'openai' as const },
];

export const useModelSelection = () => {
  const [selectedModel, setSelectedModel] = useState<Model>(() => {
    const savedModel = localStorage.getItem('selected_model');
    if (savedModel) {
      try {
        const parsed = JSON.parse(savedModel);
        if (parsed && parsed.id && parsed.name && parsed.provider) {
          console.log('Loading saved model:', parsed);
          return parsed;
        }
      } catch (e) {
        console.error('Error parsing saved model:', e);
      }
    }
    console.log('Using default model:', DEFAULT_OLLAMA_MODELS[0]);
    return DEFAULT_OLLAMA_MODELS[0];
  });

  const [availableModels, setAvailableModels] = useState<Model[]>([]);
  const [openAIKey, setOpenAIKey] = useState<string>('');
  const [isLoadingModels, setIsLoadingModels] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // 加载 Ollama 模型列表
  const loadOllamaModels = useCallback(async () => {
    try {
      console.log('Loading Ollama models...');
      const models = await getOllamaModels();
      console.log('Loaded Ollama models:', models);
      if (models.length > 0) {
        return models;
      }
    } catch (error) {
      console.error('Error loading Ollama models:', error);
    }
    console.log('Using default Ollama models');
    return DEFAULT_OLLAMA_MODELS;
  }, []);

  // 更新可用模型列表
  const updateAvailableModels = useCallback(async () => {
    setIsLoadingModels(true);
    try {
      const ollamaModels = await loadOllamaModels();
      const currentModels = [...ollamaModels];
      
      // 如果有 OpenAI key，添加 OpenAI 模型
      if (openAIKey) {
        try {
          const openAIModels = await getOpenAIModels();
          const formattedModels = openAIModels.map(model => ({
            id: model.id,
            name: model.name,
            provider: 'openai' as const
          }));
          currentModels.push(...(formattedModels.length > 0 ? formattedModels : OPENAI_DEFAULT_MODELS));
        } catch (err) {
          console.error('Error loading OpenAI models:', err);
        }
      }
      
      console.log('Setting available models:', currentModels);
      setAvailableModels(currentModels);
      
      // 验证当前选中的模型是否在可用列表中
      if (!currentModels.some(m => m.id === selectedModel.id && m.provider === selectedModel.provider)) {
        console.log('Selected model not available, switching to first available model');
        const firstAvailableModel = currentModels[0];
        if (firstAvailableModel) {
          updateSelectedModel(firstAvailableModel);
        }
      }
    } catch (error) {
      console.error('Error updating available models:', error);
      setError('加载模型列表失败');
    } finally {
      setIsLoadingModels(false);
    }
  }, [selectedModel.id, selectedModel.provider, openAIKey]);

  // 包装 setSelectedModel 以添加持久化
  const updateSelectedModel = useCallback((model: Model) => {
    console.log('Updating selected model:', model);
    if (!model || !model.id || !model.name || !model.provider) {
      console.error('Invalid model data:', model);
      return;
    }
    setSelectedModel(model);
    localStorage.setItem('selected_model', JSON.stringify(model));
  }, []);

  // 初始化时加载模型列表
  useEffect(() => {
    updateAvailableModels();
  }, [updateAvailableModels]);

  // 从本地存储加载 OpenAI key
  useEffect(() => {
    const savedKey = localStorage.getItem('openai_key');
    if (savedKey) {
      console.log('Loading saved OpenAI key');
      setOpenAIKey(savedKey);
      initOpenAI(savedKey);
    }
  }, []);

  const updateOpenAIKey = async (key: string) => {
    console.log('Updating OpenAI key');
    setOpenAIKey(key);
    localStorage.setItem('openai_key', key);
    initOpenAI(key);
    await updateAvailableModels();
  };

  return {
    selectedModel,
    setSelectedModel: updateSelectedModel,
    availableModels,
    openAIKey,
    updateOpenAIKey,
    isLoadingModels,
    error
  };
}; 