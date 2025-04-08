import { FC, useState, useEffect } from 'react'
import { useSettingStore, ThemeColor, FontFamily } from '../stores/settingStore'
import { useModelStore } from '../stores/modelStore'
import { useMCPStore, MCPServers, MCPServerConfig } from '../stores/mcpStore'
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
  const { mcpServers, addServer, removeServer, validateConfig, fetchServerTools, serverTools, updateMCPConfig } = useMCPStore()
  const [showAddServer, setShowAddServer] = useState(false)
  const [newServerName, setNewServerName] = useState('')
  const [newServerConfig, setNewServerConfig] = useState('')
  const [configError, setConfigError] = useState<string | null>(null)
  const [showFullConfig, setShowFullConfig] = useState(false)
  const [fullConfig, setFullConfig] = useState('')
  const [editingServer, setEditingServer] = useState<string | null>(null)
  const [enabledServers, setEnabledServers] = useState<Record<string, boolean>>({})
  const [isLoading, setIsLoading] = useState(false)

  // 修改 useEffect 来获取工具列表
  useEffect(() => {
    Object.entries(mcpServers).forEach(([name]) => {
      fetchServerTools(name)
    })
  }, [mcpServers])

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

  const handleEditServer = (name: string) => {
    const serverConfig = mcpServers[name]
    setNewServerName(name)
    setNewServerConfig(JSON.stringify(serverConfig, null, 2))
    setEditingServer(name)
    setShowAddServer(true)
  }

  // 添加配置比较函数
  const isServerConfigChanged = (oldConfig: MCPServerConfig | undefined, newConfigStr: string): boolean => {
    try {
      if (!oldConfig) return true // 如果是新服务器，则认为是变化的
      const newConfig = JSON.parse(newConfigStr)
      
      // 比较 command
      if (oldConfig.command !== newConfig.command) return true
      
      // 比较 args 数组
      if (!Array.isArray(newConfig.args) || oldConfig.args.length !== newConfig.args.length) return true
      for (let i = 0; i < oldConfig.args.length; i++) {
        if (oldConfig.args[i] !== newConfig.args[i]) return true
      }
      
      return false
    } catch (e) {
      return true // 如果解析失败，认为是变化的
    }
  }

  const handleAddServer = () => {
    if (!newServerName.trim()) {
      setConfigError('服务器名称不能为空')
      return
    }

    // 检查服务器名称是否重复
    if (mcpServers[newServerName] && (!editingServer || editingServer !== newServerName)) {
      setConfigError('服务器名称已存在')
      return
    }

    const validation = validateConfig(newServerConfig)
    if (!validation.isValid) {
      setConfigError(validation.error || '配置验证失败')
      return
    }

    try {
      const config = JSON.parse(newServerConfig)
      
      // 检查配置是否发生实际变化
      const nameChanged = editingServer && editingServer !== newServerName
      const configChanged = isServerConfigChanged(
        editingServer ? mcpServers[editingServer] : undefined,
        newServerConfig
      )

      // 如果名称和配置都没有变化，直接关闭窗口
      if (!nameChanged && !configChanged) {
        setShowAddServer(false)
        setNewServerName('')
        setNewServerConfig('')
        setConfigError(null)
        setEditingServer(null)
        return
      }

      if (editingServer && editingServer !== newServerName) {
        removeServer(editingServer)
      }
      
      // 构建完整的配置对象
      const fullConfig = {
        mcpServers: {
          ...mcpServers,
          [newServerName]: config
        }
      }

      setIsLoading(true)

      // 更新 MCP 配置并初始化客户端
      updateMCPConfig(JSON.stringify(fullConfig)).then(result => {
        if (result.success) {
          addServer(newServerName, config)
          setShowAddServer(false)
          setNewServerName('')
          setNewServerConfig('')
          setConfigError(null)
          setEditingServer(null)
          // 获取新服务器的工具列表
          fetchServerTools(newServerName)
          // 重新生成客户端
          window.electron.ipcRenderer.invoke('regenerate-mcp-client')
        } else {
          setConfigError(`更新 MCP 配置失败: ${result.error}`)
        }
        setIsLoading(false)
      }).catch(error => {
        setConfigError(`更新失败: ${error.message}`)
        setIsLoading(false)
      })
    } catch (e) {
      setConfigError('配置格式错误')
    }
  }

  const handleShowFullConfig = () => {
    const currentConfig = {
      mcpServers: mcpServers
    }
    setFullConfig(JSON.stringify(currentConfig, null, 2))
    setShowFullConfig(true)
  }

  // 添加检查重复 key 的函数
  const checkDuplicateKeys = (jsonStr: string): { hasDuplicate: boolean; duplicateKeys: string[] } => {
    try {
      // 将字符串解析为 JSON 对象
      const config = JSON.parse(jsonStr)
      if (!config.mcpServers || typeof config.mcpServers !== 'object') {
        return { hasDuplicate: false, duplicateKeys: [] }
      }

      // 获取原始字符串中 mcpServers 对象的起始位置
      const mcpServersStart = jsonStr.indexOf('"mcpServers"')
      if (mcpServersStart === -1) {
        return { hasDuplicate: false, duplicateKeys: [] }
      }

      // 从 mcpServers 开始的子字符串
      const mcpServersStr = jsonStr.slice(mcpServersStart)
      
      // 使用正则表达式匹配所有第一层的键
      // 这个正则表达式会匹配 "key": { 这样的模式，并且会考虑嵌套的括号
      const keys: string[] = []
      const duplicateKeys: string[] = []
      let depth = 0
      let currentKey = ''
      let isInKey = false

      for (let i = 0; i < mcpServersStr.length; i++) {
        const char = mcpServersStr[i]
        
        if (char === '{') {
          depth++
          // 第一个 { 是 mcpServers 的开始，跳过
          if (depth === 1) continue
        } else if (char === '}') {
          depth--
          if (depth === 0) break // 到达 mcpServers 对象的结束
        } else if (depth === 1) { // 只在第一层处理键名
          if (char === '"' && mcpServersStr[i-1] !== '\\') {
            if (!isInKey) {
              isInKey = true
              currentKey = ''
            } else {
              isInKey = false
              // 检查是否为服务器配置的键（后面跟着冒号和对象）
              let j = i + 1
              while (j < mcpServersStr.length && /\s/.test(mcpServersStr[j])) j++ // 跳过空白
              if (mcpServersStr[j] === ':') {
                while (j < mcpServersStr.length && /\s/.test(mcpServersStr[j+1])) j++ // 跳过空白
                if (mcpServersStr[j+1] === '{') {
                  if (keys.includes(currentKey)) {
                    if (!duplicateKeys.includes(currentKey)) {
                      duplicateKeys.push(currentKey)
                    }
                  } else {
                    keys.push(currentKey)
                  }
                }
              }
            }
            continue
          }
          if (isInKey) {
            currentKey += char
          }
        }
      }

      return {
        hasDuplicate: duplicateKeys.length > 0,
        duplicateKeys
      }
    } catch (e) {
      console.error('检查重复键时出错:', e)
      return {
        hasDuplicate: false,
        duplicateKeys: []
      }
    }
  }

  const handleSaveFullConfig = () => {
    try {
      // 首先检查是否有重复的 key
      const { hasDuplicate, duplicateKeys } = checkDuplicateKeys(fullConfig)
      if (hasDuplicate) {
        setConfigError(`配置错误：JSON 中存在重复的键名：${duplicateKeys.join(', ')}`)
        return
      }

      const config = JSON.parse(fullConfig)
      if (!config.mcpServers || typeof config.mcpServers !== 'object') {
        setConfigError('配置格式错误：缺少 mcpServers 对象')
        return
      }

      // 验证每个服务器的配置
      for (const [name, serverConfig] of Object.entries(config.mcpServers)) {
        const validation = validateConfig(JSON.stringify(serverConfig))
        if (!validation.isValid) {
          setConfigError(`服务器 "${name}" 配置错误：${validation.error}`)
          return
        }
      }

      // 检查配置是否发生实际变化
      const oldConfig = {
        mcpServers: mcpServers
      }
      const configChanged = JSON.stringify(oldConfig) !== fullConfig

      if (!configChanged) {
        // 如果配置没有变化，直接关闭窗口
        setShowFullConfig(false)
        setShowAddServer(false)
        setConfigError(null)
        return
      }

      setIsLoading(true)

      // 更新所有服务器配置
      Object.entries(mcpServers).forEach(([name]) => {
        removeServer(name)
      })
      Object.entries(config.mcpServers as MCPServers).forEach(([name, config]) => {
        addServer(name, config)
      })

      // 更新 MCP 配置并初始化客户端
      updateMCPConfig(fullConfig).then(result => {
        if (result.success) {
          setShowFullConfig(false)
          setShowAddServer(false)
          setConfigError(null)
          // 重新获取所有服务器的工具列表
          Object.keys(config.mcpServers).forEach(serverName => {
            fetchServerTools(serverName)
          })
          // 重新生成客户端
          window.electron.ipcRenderer.invoke('regenerate-mcp-client')
        } else {
          setConfigError(`更新 MCP 配置失败: ${result.error}`)
        }
        setIsLoading(false)
      }).catch(error => {
        setConfigError(`更新失败: ${error.message}`)
        setIsLoading(false)
      })
    } catch (e) {
      setConfigError('无效的 JSON 格式')
      setIsLoading(false)
    }
  }

  const handleRefreshServer = (name: string) => {
    // TODO: 实现服务器刷新逻辑
    console.log('Refreshing server:', name)
  }

  const handleToggleServer = (name: string) => {
    setEnabledServers(prev => ({
      ...prev,
      [name]: !prev[name]
    }))
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
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-lg font-medium text-gray-900 dark:text-white">MCP 服务器</h3>
              <button
                onClick={() => setShowAddServer(true)}
                className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 dark:focus:ring-offset-gray-900"
              >
                添加新服务器
              </button>
            </div>

            <div className="grid gap-4">
              {Object.entries(mcpServers).map(([name, config]) => (
                <div
                  key={name}
                  className="p-4 border border-gray-200 dark:border-gray-700 rounded-lg"
                >
                  <div className="flex justify-between items-start">
                    <div className="flex items-start gap-4">
                      <span className={cn(
                        "inline-block w-2.5 h-2.5 rounded-full mt-2",
                        serverTools[name] && serverTools[name].length > 0
                          ? "bg-green-500"
                          : "bg-red-500"
                      )} />
                      <div>
                        <h4 className="text-lg font-medium text-gray-900 dark:text-white">
                          {name}
                        </h4>
                        <p className="text-sm text-gray-500 dark:text-gray-400">
                          {config.command} {config.args.join(' ')}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <button
                        type="button"
                        onClick={() => handleToggleServer(name)}
                        className={cn(
                          "relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2",
                          enabledServers[name] ? 'bg-blue-500' : 'bg-gray-200 dark:bg-gray-700'
                        )}
                      >
                        <span
                          className={cn(
                            "pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out",
                            enabledServers[name] ? 'translate-x-5' : 'translate-x-0'
                          )}
                        />
                      </button>

                      <button
                        onClick={() => handleRefreshServer(name)}
                        className="p-1.5 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 dark:focus:ring-offset-gray-900 rounded-lg"
                      >
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                        </svg>
                      </button>

                      <button
                        onClick={() => handleEditServer(name)}
                        className="p-1.5 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 dark:focus:ring-offset-gray-900 rounded-lg"
                      >
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                        </svg>
                      </button>

                      <button
                        onClick={() => removeServer(name)}
                        className="p-1.5 text-red-500 hover:text-red-700 dark:text-red-400 dark:hover:text-red-300 focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2 dark:focus:ring-offset-gray-900 rounded-lg"
                      >
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                        </svg>
                      </button>
                    </div>
                  </div>

                  {/* 添加工具列表显示 */}
                  {serverTools[name] && serverTools[name].length > 0 && (
                    <div className="mt-4 space-y-2">
                      <h5 className="text-sm font-medium text-gray-700 dark:text-gray-300">可用工具：</h5>
                      <div className="flex flex-wrap gap-2">
                        {serverTools[name].map((tool) => (
                          <span
                            key={tool.name}
                            className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200"
                            title={tool.description}
                          >
                            {tool.name}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>

            {showAddServer && (
              <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4">
                <div className="bg-white dark:bg-gray-800 rounded-lg p-6 w-full max-w-2xl">
                  <h4 className="text-lg font-medium text-gray-900 dark:text-white mb-4">
                    {editingServer ? '编辑 MCP 服务器' : '添加新的 MCP 服务器'}
                  </h4>
                  
                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                        服务器名称
                      </label>
                      <input
                        type="text"
                        value={newServerName}
                        onChange={(e) => setNewServerName(e.target.value)}
                        className="block w-full px-4 py-2 rounded-lg border border-gray-300 dark:border-gray-600 focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700"
                        placeholder="输入服务器名称"
                      />
                    </div>

                    <div>
                      <div className="flex justify-between items-center mb-2">
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                          服务器配置
                        </label>
                        <button
                          onClick={handleShowFullConfig}
                          className="text-sm text-blue-500 hover:text-blue-600 dark:text-blue-400 dark:hover:text-blue-300"
                        >
                          查看完整配置
                        </button>
                      </div>
                      <textarea
                        value={newServerConfig}
                        onChange={(e) => setNewServerConfig(e.target.value)}
                        rows={8}
                        className="block w-full px-4 py-2 rounded-lg border border-gray-300 dark:border-gray-600 focus:ring-blue-500 focus:border-blue-500 font-mono text-base dark:bg-gray-800 text-gray-900 dark:text-gray-100"
                        placeholder="{\n  &quot;command&quot;: &quot;uvx&quot;,\n  &quot;args&quot;: [\n    &quot;blender-mcp&quot;\n  ]\n}"
                      />
                    </div>

                    {configError && (
                      <p className="text-sm text-red-600 dark:text-red-400">
                        {configError}
                      </p>
                    )}

                    <div className="flex justify-end space-x-4">
                      <button
                        onClick={() => {
                          setShowAddServer(false)
                          setNewServerName('')
                          setNewServerConfig('')
                          setConfigError(null)
                        }}
                        className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700"
                      >
                        取消
                      </button>
                      <button
                        onClick={handleAddServer}
                        className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 dark:focus:ring-offset-gray-900"
                      >
                        保存
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {showFullConfig && (
              <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4">
                <div className="bg-white dark:bg-gray-800 rounded-lg p-6 w-full max-w-4xl">
                  <h4 className="text-lg font-medium text-gray-900 dark:text-white mb-4">完整 MCP 配置</h4>
                  
                  <div className="space-y-4">
                    <textarea
                      value={fullConfig}
                      onChange={(e) => setFullConfig(e.target.value)}
                      rows={20}
                      className="block w-full px-4 py-2 rounded-lg border border-gray-300 dark:border-gray-600 focus:ring-blue-500 focus:border-blue-500 font-mono text-base dark:bg-gray-800 text-gray-900 dark:text-gray-100"
                    />

                    {configError && (
                      <p className="text-sm text-red-600 dark:text-red-400">
                        {configError}
                      </p>
                    )}

                    <div className="flex justify-end space-x-4">
                      <button
                        onClick={() => {
                          setShowFullConfig(false)
                          setConfigError(null)
                        }}
                        className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700"
                      >
                        取消
                      </button>
                      <button
                        onClick={handleSaveFullConfig}
                        className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 dark:focus:ring-offset-gray-900"
                      >
                        保存
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            )}
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
      {isLoading && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white dark:bg-gray-800 rounded-lg p-6">
            <div className="flex items-center space-x-3">
              <svg className="animate-spin h-5 w-5 text-blue-500" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
              <span className="text-gray-900 dark:text-white">正在加载 MCP 工具列表...</span>
            </div>
          </div>
        </div>
      )}
      {renderTabContent()}
    </div>
  )
}

export default Settings 