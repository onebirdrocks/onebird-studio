import { Fragment, useState, useEffect } from 'react';
import { Dialog, Transition } from '@headlessui/react';
import { useModelStore } from '../stores/modelStore';
import { useApiStore } from '../stores/apiStore';
import { ChevronLeft } from 'lucide-react';
import { getOllamaModels } from '../services/ollamaApi';
import { getOpenAIModels } from '../services/openaiApi';
import { getDeepSeekModels } from '../services/deepseekApi';
import type { Model } from '../stores/modelStore';
import { cn } from '../lib/utils';
import { FC } from 'react';
import { useNavigate } from 'react-router-dom';

interface NewChatDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (model: Model) => void;
}

type Provider = {
  id: 'ollama' | 'openai' | 'deepseek';
  name: string;
  description: string;
  requiresKey: boolean;
};

const PROVIDERS: Provider[] = [
  {
    id: 'ollama',
    name: 'Ollama',
    description: '本地运行的开源模型',
    requiresKey: false
  },
  {
    id: 'openai',
    name: 'OpenAI',
    description: 'ChatGPT 背后的模型提供商',
    requiresKey: true
  },
  {
    id: 'deepseek',
    name: 'DeepSeek',
    description: '国内领先的 AI 模型提供商',
    requiresKey: true
  }
];

export const NewChatDialog: FC<NewChatDialogProps> = ({ isOpen, onClose, onConfirm }) => {
  const { apiKeys } = useModelStore();
  const { getProviderConfig } = useApiStore();
  const navigate = useNavigate();
  const [selectedProvider, setSelectedProvider] = useState<Provider | null>(null);
  const [availableModels, setAvailableModels] = useState<Model[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadModels = async (provider: Provider) => {
    setIsLoading(true);
    setError(null);
    try {
      let models;
      switch (provider.id) {
        case 'ollama':
          models = await getOllamaModels();
          break;
        case 'openai':
          models = await getOpenAIModels();
          break;
        case 'deepseek':
          models = await getDeepSeekModels();
          break;
      }
      
      // 合并从 API 获取的模型信息和预定义的模型配置
      const supportedModels = getProviderConfig(provider.id).supportedModels;
      const mergedModels = models.map(model => {
        const supportedModel = supportedModels.find(m => m.id === model.id);
        return {
          ...model,
          provider: provider.id,
          maxTokens: supportedModel?.maxTokens
        };
      });
      
      setAvailableModels(mergedModels);
    } catch (err) {
      setError('加载模型列表失败');
      console.error('Error loading models:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleProviderSelect = async (provider: Provider) => {
    setSelectedProvider(provider);
    if (provider.requiresKey && !apiKeys[provider.id]) {
      setError('请先在设置中配置 API 密钥');
      return;
    }
    await loadModels(provider);
  };

  const handleBack = () => {
    setSelectedProvider(null);
    setAvailableModels([]);
    setError(null);
  };

  const handleModelSelect = (model: Model) => {
    if (!selectedProvider) return;
    onConfirm(model);
    onClose();
  };

  // 当对话框关闭时重置状态
  useEffect(() => {
    if (!isOpen) {
      setSelectedProvider(null);
      setAvailableModels([]);
      setError(null);
    }
  }, [isOpen]);

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
          <div className="fixed inset-0 bg-black bg-opacity-25 dark:bg-opacity-50" />
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
              <Dialog.Panel className="w-full max-w-2xl transform overflow-hidden rounded-xl bg-white dark:bg-gray-800 p-6 shadow-xl transition-all">
                <Dialog.Title className="text-lg font-medium text-gray-900 dark:text-white mb-4 flex items-center">
                  {selectedProvider && (
                    <button
                      onClick={handleBack}
                      className="mr-2 p-1 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-full"
                    >
                      <ChevronLeft className="w-5 h-5" />
                    </button>
                  )}
                  新建聊天
                </Dialog.Title>

                {error && (
                  <div className="mb-4 p-4 rounded-lg bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 flex items-center justify-between">
                    <span>{error}</span>
                    {error.includes('API 密钥') && (
                      <button
                        onClick={() => {
                          onClose();
                          navigate('/settings?tab=models');
                        }}
                        className="ml-4 px-3 py-1 text-sm bg-red-600 dark:bg-red-500 text-white rounded-md hover:bg-red-700 dark:hover:bg-red-600 transition-colors"
                      >
                        前往设置
                      </button>
                    )}
                  </div>
                )}

                {isLoading ? (
                  <div className="flex items-center justify-center py-8">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900 dark:border-white" />
                  </div>
                ) : (
                  <div className="space-y-6">
                    {!selectedProvider ? (
                      <div className="space-y-4">
                        <div className="grid grid-cols-2 gap-4">
                          {PROVIDERS.map((provider) => (
                            <button
                              key={provider.id}
                              onClick={() => handleProviderSelect(provider)}
                              className={cn(
                                'p-4 rounded-lg border text-left transition-colors',
                                'border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800'
                              )}
                            >
                              <div className="font-medium text-gray-900 dark:text-white">
                                {provider.name}
                              </div>
                              <div className="text-sm text-gray-500 dark:text-gray-400">
                                {provider.description}
                              </div>
                            </button>
                          ))}
                        </div>
                      </div>
                    ) : (
                      availableModels.length > 0 && (
                        <div className="space-y-4">
                          <div className="grid grid-cols-2 gap-4">
                            {availableModels.map((model) => (
                              <button
                                key={model.id || model.name}
                                onClick={() => handleModelSelect(model)}
                                className={cn(
                                  'p-4 rounded-lg border text-left transition-colors',
                                  'border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800'
                                )}
                              >
                                <div className="font-medium text-gray-900 dark:text-white">
                                  {model.name}
                                </div>
                                {model.details && (
                                  <div className="text-sm text-gray-500 dark:text-gray-400">
                                    {Object.entries(model.details).map(([key, value]) => (
                                      <span key={`${model.id || model.name}-${key}`} className="mr-2">
                                        {key}: {value}
                                      </span>
                                    ))}
                                  </div>
                                )}
                              </button>
                            ))}
                          </div>
                        </div>
                      )
                    )}

                    <div className="flex justify-end space-x-4">
                      <button
                        type="button"
                        className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white"
                        onClick={onClose}
                      >
                        取消
                      </button>
                    </div>
                  </div>
                )}
              </Dialog.Panel>
            </Transition.Child>
          </div>
        </div>
      </Dialog>
    </Transition>
  );
};

export default NewChatDialog; 