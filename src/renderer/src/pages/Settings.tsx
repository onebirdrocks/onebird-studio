import { FC, useState } from 'react'
import { useSettingStore, ThemeColor, FontFamily } from '../stores/settingStore'
import { useModelStore } from '../stores/modelStore'
import { cn } from '../lib/utils'
import { checkOpenAIApiKey } from '../services/openaiApi'
import { checkDeepSeekApiKey } from '../services/deepseekApi'

type SettingTab = 'general' | 'models' | 'mcp' | 'beta'

const themeColors: { id: ThemeColor; name: string; light: string; dark: string }[] = [
  { id: 'teal', name: '青绿色', light: 'bg-teal-500', dark: 'dark:bg-teal-600' },
  { id: 'sky', name: '天蓝色', light: 'bg-sky-500', dark: 'dark:bg-sky-600' },
  { id: 'rose', name: '玫瑰色', light: 'bg-rose-500', dark: 'dark:bg-rose-600' },
  { id: 'purple', name: '紫色', light: 'bg-purple-500', dark: 'dark:bg-purple-600' }
]

const fontFamilies: { id: FontFamily; name: string; className: string }[] = [
  { id: 'system', name: '系统默认', className: 'font-sans' },
  { id: 'inter', name: 'Inter', className: 'font-inter' },
  { id: 'roboto', name: 'Roboto', className: 'font-roboto' },
  { id: 'sourceHanSans', name: '思源黑体', className: 'font-source-han-sans' }
]


const Settings: FC = () => {
  const [activeTab, setActiveTab] = useState<SettingTab>('general')
  const [validating, setValidating] = useState<Record<string, boolean>>({})
  const [validationStatus, setValidationStatus] = useState<Record<string, 'success' | 'error' | null>>({})
  const { themeColor, setThemeColor, fontSize, setFontSize, fontFamily, setFontFamily } = useSettingStore()
  const { apiKeys, setApiKey, removeApiKey } = useModelStore()

  const handleValidateKey = async (model: 'openai' | 'deepseek') => {
    if (!apiKeys[model]) return

    setValidating(prev => ({ ...prev, [model]: true }))
    setValidationStatus(prev => ({ ...prev, [model]: null }))

    try {
      const isValid = model === 'openai' 
        ? await checkOpenAIApiKey(apiKeys[model]!)
        : await checkDeepSeekApiKey(apiKeys[model]!)
      
      setValidationStatus(prev => ({ 
        ...prev, 
        [model]: isValid ? 'success' : 'error' 
      }))
    } catch (error) {
      setValidationStatus(prev => ({ ...prev, [model]: 'error' }))
    } finally {
      setValidating(prev => ({ ...prev, [model]: false }))
    }
  }

  const tabs: { id: SettingTab; name: string }[] = [
    { id: 'general', name: '通用' },
    { id: 'models', name: '模型' },
    { id: 'mcp', name: 'MCP' },
    { id: 'beta', name: 'Beta' }
  ]

  const renderTabContent = () => {
    switch (activeTab) {
      case 'general':
        return (
          <div className="space-y-8">
            <div>
              <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">主题颜色</h3>
              <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">
                选择的颜色将用于模型思考过程的展示样式，让你更容易识别模型的推理过程。
              </p>
              <div className="grid grid-cols-4 gap-4">
                {themeColors.map(color => (
                  <button
                    key={color.id}
                    onClick={() => setThemeColor(color.id)}
                    className="relative group"
                  >
                    <div className={cn(
                      'h-20 rounded-lg transition-all',
                      color.light,
                      color.dark,
                      'group-hover:scale-105',
                      themeColor === color.id ? 'ring-2 ring-offset-2 dark:ring-offset-gray-900 ring-blue-500' : ''
                    )} />
                    <span className={cn(
                      'absolute bottom-0 left-1/2 -translate-x-1/2 translate-y-full pt-2',
                      'text-sm text-gray-600 dark:text-gray-400',
                      themeColor === color.id ? 'font-medium text-gray-900 dark:text-white' : ''
                    )}>
                      {color.name}
                    </span>
                  </button>
                ))}
              </div>
            </div>

            <div>
              <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">字体设置</h3>
              <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">
                自定义应用的字体和大小，让阅读更舒适。
              </p>
              
              <div className="space-y-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    字体大小
                  </label>
                  <div className="flex items-center gap-4">
                    <input
                      type="range"
                      min="12"
                      max="32"
                      step="2"
                      value={fontSize}
                      onChange={(e) => setFontSize(Number(e.target.value))}
                      className="flex-1 h-2 bg-gray-200 dark:bg-gray-700 rounded-lg appearance-none cursor-pointer"
                    />
                    <span className="text-sm text-gray-600 dark:text-gray-400 min-w-[3rem] text-right">
                      {fontSize}px
                    </span>
                  </div>
                  <div className="mt-2 text-base text-gray-900 dark:text-white" style={{ fontSize: `${fontSize}px` }}>
                    示例文本 Example Text
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    字体选择
                  </label>
                  <div className="grid grid-cols-2 gap-4">
                    {fontFamilies.map(font => (
                      <button
                        key={font.id}
                        onClick={() => setFontFamily(font.id)}
                        className={cn(
                          'px-4 py-3 rounded-lg border text-base transition-colors text-center',
                          font.className,
                          fontFamily === font.id
                            ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-300'
                            : 'border-gray-300 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-800'
                        )}
                      >
                        {font.name}
                      </button>
                    ))}
                  </div>
                  <div className="mt-4 grid grid-cols-2 gap-4">
                    {fontFamilies.map(font => (
                      <div
                        key={font.id}
                        className={cn(
                          'p-4 rounded-lg border border-gray-200 dark:border-gray-700',
                          font.className
                        )}
                      >
                        <div className="text-sm text-gray-500 dark:text-gray-400 mb-2">{font.name}</div>
                        <div className="text-base text-gray-900 dark:text-white" style={{ fontSize: `${fontSize}px` }}>
                          汉字示例 Example Text
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </div>
        )

      case 'models':
        return (
          <div className="space-y-6">
            <div>
              <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-4">API 密钥</h3>
              <div className="space-y-6">
                {(['openai', 'deepseek'] as const).map(model => (
                  <div key={model} className="flex items-center gap-4">
                    <div className="flex-1">
                      <label htmlFor={model} className="block text-base font-medium text-gray-700 dark:text-gray-300 mb-2">
                        {model === 'openai' ? 'OpenAI' : 'DeepSeek'}
                      </label>
                      <div className="flex gap-2">
                        <input
                          type="password"
                          name={model}
                          id={model}
                          value={apiKeys[model] || ''}
                          placeholder={`sk-...`}
                          onChange={(e) => {
                            setApiKey(model, e.target.value)
                            setValidationStatus(prev => ({ ...prev, [model]: null }))
                          }}
                          className={cn(
                            "block w-full px-4 py-2 rounded-lg border focus:ring-blue-500 text-base dark:bg-gray-700",
                            validationStatus[model] === 'success' ? 'border-green-500 dark:border-green-500' : 
                            validationStatus[model] === 'error' ? 'border-red-500 dark:border-red-500' :
                            'border-gray-300 dark:border-gray-600 focus:border-blue-500'
                          )}
                        />
                        <button
                          onClick={() => handleValidateKey(model)}
                          disabled={!apiKeys[model] || validating[model]}
                          className={cn(
                            "px-4 py-2 rounded-lg border font-medium text-base transition-colors",
                            "focus:outline-none focus:ring-2 focus:ring-offset-2 dark:focus:ring-offset-gray-900",
                            validating[model] ? 
                              "bg-gray-100 dark:bg-gray-800 text-gray-400 dark:text-gray-500 cursor-not-allowed" :
                              "bg-white dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-600"
                          )}
                        >
                          {validating[model] ? '验证中...' : '验证'}
                        </button>
                        {apiKeys[model] && (
                          <button
                            onClick={() => removeApiKey(model)}
                            className="inline-flex items-center px-4 py-2 border border-transparent text-base font-medium rounded-lg text-white bg-red-600 hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500 dark:focus:ring-offset-gray-900"
                          >
                            删除
                          </button>
                        )}
                      </div>
                      {validationStatus[model] === 'success' && (
                        <p className="mt-2 text-sm text-green-600 dark:text-green-400">
                          API Key 验证成功
                        </p>
                      )}
                      {validationStatus[model] === 'error' && (
                        <p className="mt-2 text-sm text-red-600 dark:text-red-400">
                          API Key 验证失败，请检查后重试
                        </p>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )

      case 'mcp':
        return (
          <div className="space-y-6">
            <div>
              <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-4">MCP 设置</h3>
              <p className="text-sm text-gray-500 dark:text-gray-400">
                MCP 相关设置将在后续版本中添加。
              </p>
            </div>
          </div>
        )

      case 'beta':
        return (
          <div className="space-y-6">
            <div>
              <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-4">Beta 功能</h3>
              <p className="text-sm text-gray-500 dark:text-gray-400">
                Beta 功能将在后续版本中添加。
              </p>
            </div>
          </div>
        )

      default:
        return null
    }
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="flex space-x-4 mb-8">
        {tabs.map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={cn(
              'px-4 py-2 text-sm font-medium rounded-md',
              activeTab === tab.id
                ? 'bg-gray-200 dark:bg-gray-700 text-gray-900 dark:text-white'
                : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300'
            )}
          >
            {tab.name}
          </button>
        ))}
      </div>
      {renderTabContent()}
    </div>
  )
}

export default Settings 