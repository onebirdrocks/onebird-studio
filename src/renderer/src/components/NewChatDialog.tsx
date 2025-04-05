import { Fragment, useState, useEffect } from 'react';
import { Dialog, Transition } from '@headlessui/react';
import { useModelStore } from '../stores/modelStore';
import { ChevronLeft } from 'lucide-react';
import { getOllamaModels } from '../services/ollamaApi';
import { getOpenAIModels } from '../services/openaiApi';
import { getDeepSeekModels } from '../services/deepseekApi';

interface NewChatDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (model: { id: string; name: string; provider: 'ollama' | 'openai' | 'deepseek' }) => void;
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

export default function NewChatDialog({ isOpen, onClose, onConfirm }: NewChatDialogProps) {
  const { apiKeys } = useModelStore();
  const [selectedProvider, setSelectedProvider] = useState<Provider | null>(null);
  const [availableModels, setAvailableModels] = useState<Array<{ id: string; name: string }>>([]);
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
      setAvailableModels(models);
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

  const handleModelSelect = (model: { id: string; name: string }) => {
    if (!selectedProvider) return;
    onConfirm({
      ...model,
      provider: selectedProvider.id
    });
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
              <Dialog.Panel className="w-full max-w-md transform overflow-hidden rounded-2xl bg-white dark:bg-gray-800 p-6 text-left align-middle shadow-xl transition-all">
                <div className="flex items-center gap-4 mb-4">
                  {selectedProvider && (
                    <button
                      onClick={handleBack}
                      className="p-1 text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white"
                    >
                      <ChevronLeft size={20} />
                    </button>
                  )}
                  <Dialog.Title
                    as="h3"
                    className="text-lg font-medium leading-6 text-gray-900 dark:text-white"
                  >
                    {selectedProvider ? '选择模型' : '选择提供商'}
                  </Dialog.Title>
                </div>

                {error && (
                  <div className="mb-4 p-3 bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 rounded-lg">
                    {error}
                  </div>
                )}

                <div className="mt-4 space-y-2">
                  {!selectedProvider ? (
                    // 显示提供商列表
                    PROVIDERS.map(provider => {
                      const isAvailable = !provider.requiresKey || apiKeys[provider.id];
                      return (
                        <button
                          key={provider.id}
                          onClick={() => handleProviderSelect(provider)}
                          disabled={!isAvailable}
                          className={`w-full p-4 rounded-lg text-left transition-colors ${
                            isAvailable
                              ? 'hover:bg-gray-100 dark:hover:bg-gray-700'
                              : 'opacity-50 cursor-not-allowed'
                          }`}
                        >
                          <div className="font-medium text-gray-900 dark:text-white">
                            {provider.name}
                          </div>
                          <div className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                            {provider.description}
                            {provider.requiresKey && !apiKeys[provider.id] && (
                              <span className="text-yellow-600 dark:text-yellow-400 ml-2">
                                需要配置 API 密钥
                              </span>
                            )}
                          </div>
                        </button>
                      );
                    })
                  ) : (
                    // 显示模型列表
                    isLoading ? (
                      <div className="text-center py-8 text-gray-500 dark:text-gray-400">
                        加载模型列表中...
                      </div>
                    ) : availableModels.length > 0 ? (
                      availableModels.map(model => (
                        <button
                          key={model.id}
                          onClick={() => handleModelSelect(model)}
                          className="w-full p-4 rounded-lg text-left transition-colors hover:bg-gray-100 dark:hover:bg-gray-700"
                        >
                          <div className="font-medium text-gray-900 dark:text-white">
                            {model.name}
                          </div>
                        </button>
                      ))
                    ) : (
                      <div className="text-center py-8 text-gray-500 dark:text-gray-400">
                        没有可用的模型
                      </div>
                    )
                  )}
                </div>

                <div className="mt-6 flex justify-end">
                  <button
                    type="button"
                    className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white"
                    onClick={onClose}
                  >
                    取消
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