import { useState, useEffect } from 'react';
import { Dialog, Transition } from '@headlessui/react';
import { Fragment } from 'react';
import { initOpenAI, getOpenAIModels } from '../services/openaiApi';
import { getOllamaModels } from '../services/ollamaApi';
import { initDeepSeek, getDeepSeekModels } from '../services/deepseekApi';

interface NewChatDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (model: { id: string; name: string; provider: 'ollama' | 'openai' | 'deepseek' }) => void;
}

interface Model {
  id: string;
  name: string;
}

const OLLAMA_MODELS = [
  { id: 'deepseek-r1:latest', name: 'DeepSeek R1' },
  { id: 'llama2:latest', name: 'Llama 2' },
  { id: 'mistral:latest', name: 'Mistral' },
  { id: 'codellama:latest', name: 'Code Llama' },
  { id: 'qwen:latest', name: 'Qwen' },
];

export default function NewChatDialog({ isOpen, onClose, onConfirm }: NewChatDialogProps) {
  const [provider, setProvider] = useState<'ollama' | 'openai' | 'deepseek'>('ollama');
  const [openAIKey, setOpenAIKey] = useState('');
  const [deepseekKey, setDeepseekKey] = useState('');
  const [models, setModels] = useState<Model[]>(OLLAMA_MODELS);
  const [selectedModel, setSelectedModel] = useState<string>(OLLAMA_MODELS[0].id);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  // 加载 Ollama 模型列表
  const loadOllamaModels = async () => {
    setIsLoading(true);
    try {
      console.log('Loading Ollama models in dialog...');
      const ollamaModels = await getOllamaModels();
      console.log('Loaded Ollama models:', ollamaModels);
      if (ollamaModels.length === 0) {
        setModels(OLLAMA_MODELS);
        setSelectedModel(OLLAMA_MODELS[0].id);
      } else {
        setModels(ollamaModels);
        setSelectedModel(ollamaModels[0].id);
      }
    } catch (err) {
      console.error('Error loading Ollama models:', err);
      setError('加载 Ollama 模型失败，使用默认模型列表');
      setModels(OLLAMA_MODELS);
      setSelectedModel(OLLAMA_MODELS[0].id);
    } finally {
      setIsLoading(false);
    }
  };

  const handleProviderChange = async (newProvider: 'ollama' | 'openai' | 'deepseek') => {
    console.log('Changing provider to:', newProvider);
    setProvider(newProvider);
    setError(null);
    setModels([]);
    setSelectedModel('');
    
    if (newProvider === 'ollama') {
      await loadOllamaModels();
    } else if (newProvider === 'openai') {
      if (openAIKey) {
        await handleOpenAIKeySubmit();
      }
    } else if (newProvider === 'deepseek') {
      if (deepseekKey) {
        await handleDeepSeekKeySubmit();
      }
    }
  };

  // 当对话框打开时加载模型列表
  useEffect(() => {
    if (isOpen) {
      if (provider === 'ollama') {
        loadOllamaModels();
      } else if (provider === 'openai' && openAIKey) {
        handleOpenAIKeySubmit();
      } else if (provider === 'deepseek' && deepseekKey) {
        handleDeepSeekKeySubmit();
      }
    }
  }, [isOpen]);

  const handleOpenAIKeySubmit = async () => {
    setIsLoading(true);
    setError(null);
    try {
      console.log('Submitting OpenAI key...');
      initOpenAI(openAIKey);
      const openAIModels = await getOpenAIModels();
      console.log('Loaded OpenAI models:', openAIModels);
      const formattedModels = openAIModels.map(model => ({
        id: model.id,
        name: model.name
      }));
      setModels(formattedModels);
      if (formattedModels.length > 0) {
        setSelectedModel(formattedModels[0].id);
      }
      localStorage.setItem('openai_key', openAIKey);
    } catch (err) {
      console.error('Error loading OpenAI models:', err);
      setError(err instanceof Error ? err.message : '加载模型失败');
    } finally {
      setIsLoading(false);
    }
  };

  const handleDeepSeekKeySubmit = async () => {
    setError(null);
    setIsLoading(true);
    try {
      console.log('Submitting DeepSeek key...');
      initDeepSeek(deepseekKey);
      console.log('Initialized DeepSeek with key');
      
      const deepseekModels = await getDeepSeekModels();
      console.log('Loaded DeepSeek models:', deepseekModels);
      
      if (deepseekModels.length === 0) {
        throw new Error('没有可用的 DeepSeek 模型');
      }
      
      setModels(deepseekModels);
      setSelectedModel(deepseekModels[0].id);
    } catch (err) {
      console.error('Error loading DeepSeek models:', err);
      setError(err instanceof Error ? err.message : '加载 DeepSeek 模型失败');
      setModels([]);
      setSelectedModel('');
    } finally {
      setIsLoading(false);
    }
  };

  const handleConfirm = () => {
    if (!selectedModel) {
      setError('请选择一个模型');
      return;
    }

    const modelInfo = models.find(m => m.id === selectedModel);
    if (!modelInfo) {
      setError('所选模型不存在');
      return;
    }

    const selectedModelInfo = {
      id: modelInfo.id,
      name: modelInfo.name,
      provider
    };

    console.log('Confirming model selection:', selectedModelInfo);
    onConfirm(selectedModelInfo);
    onClose();
  };

  // 从 localStorage 加载 API keys
  useEffect(() => {
    const savedOpenAIKey = localStorage.getItem('openai_key');
    const savedDeepSeekKey = localStorage.getItem('deepseek_key');
    if (savedOpenAIKey) setOpenAIKey(savedOpenAIKey);
    if (savedDeepSeekKey) setDeepseekKey(savedDeepSeekKey);
  }, []);

  return (
    <Transition appear show={isOpen} as={Fragment}>
      <Dialog as="div" className="relative z-50" onClose={onClose}>
        <Transition.Child
          as={Fragment}
          enter="ease-out duration-300"
          enterFrom="opacity-0"
          enterTo="opacity-100"
          leave="ease-in duration-200"
          leaveFrom="opacity-100"
          leaveTo="opacity-0"
        >
          <div className="fixed inset-0 bg-black bg-opacity-25" />
        </Transition.Child>

        <div className="fixed inset-0 overflow-y-auto">
          <div className="flex min-h-full items-center justify-center p-4">
            <Transition.Child
              as={Fragment}
              enter="ease-out duration-300"
              enterFrom="opacity-0 scale-95"
              enterTo="opacity-100 scale-100"
              leave="ease-in duration-200"
              leaveFrom="opacity-100 scale-100"
              leaveTo="opacity-0 scale-95"
            >
              <Dialog.Panel className="w-full max-w-md transform overflow-hidden rounded-2xl bg-white dark:bg-gray-800 p-6 text-left align-middle shadow-xl transition-all">
                <Dialog.Title
                  as="h3"
                  className="text-lg font-medium leading-6 text-gray-900 dark:text-white"
                >
                  新建对话
                </Dialog.Title>

                <div className="mt-4">
                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                        选择提供商
                      </label>
                      <select
                        value={provider}
                        onChange={(e) => handleProviderChange(e.target.value as 'ollama' | 'openai' | 'deepseek')}
                        className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                      >
                        <option value="ollama">Local Ollama</option>
                        <option value="openai">OpenAI</option>
                        <option value="deepseek">DeepSeek</option>
                      </select>
                    </div>

                    {provider === 'openai' && (
                      <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                          OpenAI API Key
                        </label>
                        <div className="mt-1 flex rounded-md shadow-sm">
                          <input
                            type="password"
                            value={openAIKey}
                            onChange={(e) => setOpenAIKey(e.target.value)}
                            className="flex-1 rounded-l-md border-gray-300 focus:border-blue-500 focus:ring-blue-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                            placeholder="sk-..."
                          />
                          <button
                            type="button"
                            onClick={handleOpenAIKeySubmit}
                            disabled={isLoading || !openAIKey}
                            className="inline-flex items-center rounded-r-md border border-l-0 border-gray-300 bg-gray-50 px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-100 focus:outline-none focus:ring-1 focus:ring-blue-500 disabled:opacity-50 dark:bg-gray-600 dark:border-gray-600 dark:text-white dark:hover:bg-gray-500"
                          >
                            {isLoading ? '加载中...' : '验证'}
                          </button>
                        </div>
                      </div>
                    )}

                    {provider === 'deepseek' && (
                      <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                          DeepSeek API Key
                        </label>
                        <div className="mt-1 flex rounded-md shadow-sm">
                          <input
                            type="password"
                            value={deepseekKey}
                            onChange={(e) => setDeepseekKey(e.target.value)}
                            className="flex-1 rounded-l-md border-gray-300 focus:border-blue-500 focus:ring-blue-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                            placeholder="dsk-... 或 sk-..."
                          />
                          <button
                            type="button"
                            onClick={handleDeepSeekKeySubmit}
                            disabled={isLoading || !deepseekKey}
                            className="inline-flex items-center rounded-r-md border border-l-0 border-gray-300 bg-gray-50 px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-100 focus:outline-none focus:ring-1 focus:ring-blue-500 disabled:opacity-50 dark:bg-gray-600 dark:border-gray-600 dark:text-white dark:hover:bg-gray-500"
                          >
                            {isLoading ? '加载中...' : '验证'}
                          </button>
                        </div>
                      </div>
                    )}

                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                        选择模型
                      </label>
                      <select
                        value={selectedModel}
                        onChange={(e) => setSelectedModel(e.target.value)}
                        className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                      >
                        {models.length === 0 ? (
                          <option value="">加载中...</option>
                        ) : (
                          models.map((model) => (
                            <option key={model.id} value={model.id}>
                              {model.name}
                            </option>
                          ))
                        )}
                      </select>
                    </div>

                    {error && (
                      <div className="text-sm text-red-600 dark:text-red-400">
                        {error}
                      </div>
                    )}
                  </div>
                </div>

                <div className="mt-6 flex justify-end space-x-3">
                  <button
                    type="button"
                    className="inline-flex justify-center rounded-md border border-transparent bg-gray-100 px-4 py-2 text-sm font-medium text-gray-900 hover:bg-gray-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-gray-500 focus-visible:ring-offset-2 dark:bg-gray-700 dark:text-white dark:hover:bg-gray-600"
                    onClick={onClose}
                  >
                    取消
                  </button>
                  <button
                    type="button"
                    className="inline-flex justify-center rounded-md border border-transparent bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2 disabled:opacity-50"
                    onClick={handleConfirm}
                    disabled={!selectedModel || (provider === 'openai' && !openAIKey) || (provider === 'deepseek' && !deepseekKey)}
                  >
                    确认
                  </button>
                </div>
              </Dialog.Panel>
            </Transition.Child>
          </div>
        </div>
      </Dialog>
    </Transition>
  );
} 