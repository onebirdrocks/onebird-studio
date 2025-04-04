import { useState, useEffect, useCallback } from 'react';
import { getOllamaModels } from '../services/ollamaApi';
import { getOpenAIModels } from '../services/openaiApi';
import { getDeepSeekModels } from '../services/deepseekApi';

export interface Model {
  id: string;
  name: string;
  provider: 'ollama' | 'openai' | 'deepseek';
}

const DEFAULT_OLLAMA_MODELS: Model[] = [
  { id: 'deepseek-r1:latest', name: 'DeepSeek R1', provider: 'ollama' },
  { id: 'llama2:latest', name: 'Llama 2', provider: 'ollama' },
  { id: 'mistral:latest', name: 'Mistral', provider: 'ollama' },
  { id: 'codellama:latest', name: 'Code Llama', provider: 'ollama' },
  { id: 'qwen:latest', name: 'Qwen', provider: 'ollama' },
];

export function useModelSelection() {
  const [selectedModel, setSelectedModel] = useState<Model>(() => {
    const savedModel = localStorage.getItem('selected_model');
    if (savedModel) {
      try {
        return JSON.parse(savedModel);
      } catch (e) {
        console.error('Error parsing saved model:', e);
      }
    }
    return DEFAULT_OLLAMA_MODELS[0];
  });
  const [availableModels, setAvailableModels] = useState<Model[]>(DEFAULT_OLLAMA_MODELS);
  const [openAIKey, setOpenAIKey] = useState<string>(() => localStorage.getItem('openai_key') || '');
  const [deepseekKey, setDeepseekKey] = useState<string>(() => localStorage.getItem('deepseek_key') || '');
  const [isLoadingModels, setIsLoadingModels] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const updateSelectedModel = useCallback((model: Model) => {
    console.log('Updating selected model to:', model);
    setSelectedModel(model);
    localStorage.setItem('selected_model', JSON.stringify(model));
  }, []);

  const loadOllamaModels = useCallback(async () => {
    try {
      console.log('Loading Ollama models...');
      const models = await getOllamaModels();
      return models.map(model => ({
        ...model,
        provider: 'ollama' as const
      }));
    } catch (err) {
      console.error('Error loading Ollama models:', err);
      return DEFAULT_OLLAMA_MODELS;
    }
  }, []);

  const updateAvailableModels = useCallback(async () => {
    setIsLoadingModels(true);
    setError(null);
    try {
      let allModels: Model[] = [];

      // 只加载当前选中提供商的模型
      switch (selectedModel.provider) {
        case 'ollama':
          allModels = await loadOllamaModels();
          break;
        case 'openai':
          if (openAIKey) {
            try {
              allModels = await getOpenAIModels();
            } catch (err) {
              console.error('Error loading OpenAI models:', err);
              setError('加载 OpenAI 模型失败');
            }
          }
          break;
        case 'deepseek':
          if (deepseekKey) {
            try {
              allModels = await getDeepSeekModels();
            } catch (err) {
              console.error('Error loading DeepSeek models:', err);
              setError('加载 DeepSeek 模型失败');
            }
          }
          break;
      }

      console.log('Available models for provider', selectedModel.provider, ':', allModels);
      setAvailableModels(allModels);

      // 如果当前选中的模型不在可用模型列表中，选择第一个可用模型
      const isCurrentModelAvailable = allModels.some(
        model => model.id === selectedModel.id
      );

      if (!isCurrentModelAvailable && allModels.length > 0) {
        updateSelectedModel(allModels[0]);
      }
    } catch (err) {
      console.error('Error updating models:', err);
      setError('加载模型列表失败');
    } finally {
      setIsLoadingModels(false);
    }
  }, [selectedModel, openAIKey, deepseekKey, loadOllamaModels, updateSelectedModel]);

  // 当 API keys 变化时更新模型列表
  useEffect(() => {
    updateAvailableModels();
  }, [updateAvailableModels]);

  // 每 30 秒更新一次模型列表
  useEffect(() => {
    const intervalId = setInterval(updateAvailableModels, 30000);
    return () => clearInterval(intervalId);
  }, [updateAvailableModels]);

  const setOpenAIKeyWithStorage = useCallback((key: string) => {
    setOpenAIKey(key);
    if (key) {
      localStorage.setItem('openai_key', key);
    } else {
      localStorage.removeItem('openai_key');
    }
  }, []);

  const setDeepseekKeyWithStorage = useCallback((key: string) => {
    setDeepseekKey(key);
    if (key) {
      localStorage.setItem('deepseek_key', key);
    } else {
      localStorage.removeItem('deepseek_key');
    }
  }, []);

  return {
    selectedModel,
    setSelectedModel: updateSelectedModel,
    availableModels,
    openAIKey,
    setOpenAIKey: setOpenAIKeyWithStorage,
    deepseekKey,
    setDeepseekKey: setDeepseekKeyWithStorage,
    isLoadingModels,
    error,
    updateAvailableModels
  };
} 