import { create } from 'zustand'
import { persist } from 'zustand/middleware'

export interface MCPServerConfig {
  command: string
  args: string[]
}

export interface MCPServers {
  [key: string]: MCPServerConfig
}

interface MCPStore {
  mcpServers: MCPServers
  addServer: (name: string, config: MCPServerConfig) => void
  removeServer: (name: string) => void
  validateConfig: (config: string) => { isValid: boolean; error?: string }
}

export const useMCPStore = create<MCPStore>()(
  persist(
    (set) => ({
      mcpServers: {},
      addServer: (name, config) => 
        set((state) => ({
          mcpServers: {
            ...state.mcpServers,
            [name]: config
          }
        })),
      removeServer: (name) =>
        set((state) => {
          const newServers = { ...state.mcpServers }
          delete newServers[name]
          return { mcpServers: newServers }
        }),
      validateConfig: (configStr) => {
        try {
          const config = JSON.parse(configStr)
          if (typeof config !== 'object' || config === null) {
            return { isValid: false, error: '配置必须是一个对象' }
          }
          if (!config.command || typeof config.command !== 'string') {
            return { isValid: false, error: '缺少 command 字段或类型不正确' }
          }
          if (!Array.isArray(config.args)) {
            return { isValid: false, error: 'args 必须是一个数组' }
          }
          if (!config.args.every(arg => typeof arg === 'string')) {
            return { isValid: false, error: 'args 数组中的所有元素必须是字符串' }
          }
          return { isValid: true }
        } catch (e) {
          return { isValid: false, error: '无效的 JSON 格式' }
        }
      }
    }),
    {
      name: 'mcp-storage'
    }
  )
) 