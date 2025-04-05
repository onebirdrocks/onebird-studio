import React from 'react';
import { useModelStore } from '../stores/modelStore';

export function ModelSelector() {
  const {
    models,
    selectedModel,
    setSelectedModel,
    apiKeys
  } = useModelStore();

  return (
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
                  ? 'bg-blue-100 text-blue-900'
                  : isAvailable
                  ? 'hover:bg-gray-100'
                  : 'bg-gray-50 text-gray-400'
              }`}
            >
              <div className="font-medium">{model.name}</div>
              <div className="text-sm text-gray-500">
                {model.provider === 'ollama' ? '本地模型' : '需要 API 密钥'}
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
} 