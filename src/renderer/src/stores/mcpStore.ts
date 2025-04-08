import { create } from 'zustand'

export interface MCPServerConfig {
  command: string
  args: string[]
}

export interface MCPToolInfo {
  name: string
  description: string
}

export type MCPServers = Record<string, MCPServerConfig>

interface MCPState {
  mcpServers: MCPServers
  serverTools: Record<string, MCPToolInfo[]>
  addServer: (name: string, config: MCPServerConfig) => void
  removeServer: (name: string) => void
  validateConfig: (configStr: string) => { isValid: boolean; error?: string }
  fetchServerTools: (serverName: string, config: MCPServerConfig) => Promise<void>
}

export const useMCPStore = create<MCPState>((set, get) => ({
  mcpServers: {},
  serverTools: {},
  
  addServer: (name, config) => {
    set((state) => ({
      mcpServers: {
        ...state.mcpServers,
        [name]: config
      }
    }))
  },

  removeServer: (name) => {
    set((state) => {
      const { [name]: _, ...rest } = state.mcpServers
      return { mcpServers: rest }
    })
  },

  validateConfig: (configStr: string) => {
    try {
      const config = JSON.parse(configStr)
      if (!config.command || !Array.isArray(config.args)) {
        return { isValid: false, error: '配置必须包含 command 和 args 字段' }
      }
      return { isValid: true }
    } catch (e) {
      return { isValid: false, error: '无效的 JSON 格式' }
    }
  },

  fetchServerTools: async (serverName: string, config: MCPServerConfig) => {
    try {
      const tools = await window.electron.ipcRenderer.invoke('get-mcp-tools', config)
      set((state) => ({
        serverTools: {
          ...state.serverTools,
          [serverName]: tools
        }
      }))
    } catch (error) {
      console.error('Failed to fetch server tools:', error)
    }
  }
})) 