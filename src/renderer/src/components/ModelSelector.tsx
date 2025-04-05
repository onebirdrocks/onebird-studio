import React from 'react';
import { useModelStore } from '../stores/modelStore';
import { SettingsPanel } from './SettingsPanel';

export function ModelSelector() {
  const {
    models,
    selectedModel,
    setSelectedModel,
    apiKeys
  } = useModelStore();

  return (
    <div className="border-b">
      <div className="p-4 border-b">
        <h2 className="text-lg font-semibold mb-4">选择模型</h2>

        {/* 模型列表 */}
        <div className="space-y-2">
          {models.map(model => {
            const isAvailable = model.provider === 'ollama' || apiKeys[model.provider];
            return (
              <button
                key={model.id}
                onClick={() => isAvailable && setSelectedModel(model)}
                disabled={!isAvailable}
                className={`w-full p-3 rounded text-left transition-colors ${
                  model.id === selectedModel?.id
                    ? 'bg-blue-100 text-blue-900 dark:bg-blue-900/50 dark:text-blue-100'
                    : isAvailable
                    ? 'hover:bg-gray-100 dark:hover:bg-gray-800'
                    : 'bg-gray-50 text-gray-400 dark:bg-gray-800/50 dark:text-gray-500'
                }`}
              >
                <div className="font-medium">{model.name}</div>
                <div className="text-sm text-gray-500 dark:text-gray-400">
                  {model.provider === 'ollama' ? '本地模型' : '需要 API 密钥'}
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* 设置面板 */}
      <SettingsPanel />
    </div>
  );
} 