import { create } from 'zustand'
import { Client } from '@modelcontextprotocol/sdk/client/index.js'
import { StdioClientTransport } from '@modelcontextprotocol/sdk/client/stdio.js'
import type { Tool } from '@modelcontextprotocol/sdk/types.js'

export interface MCPTool {
  name: string
  description?: string
}

export interface MCPClientStatus {
  isConnected: boolean
  tools: MCPTool[]
  error?: string
}

interface MCPClientStore {
  clientStatuses: Record<string, MCPClientStatus>
  setClientStatus: (serverName: string, status: MCPClientStatus) => void
  clearClientStatus: (serverName: string) => void
  connectToServer: (serverName: string, command: string, args: string[]) => Promise<void>
  disconnectFromServer: (serverName: string) => Promise<void>
  reloadServer: (serverName: string, command: string, args: string[]) => Promise<void>
}

const clients: Record<string, Client> = {}
const transports: Record<string, StdioClientTransport> = {}

export const useMCPClientStore = create<MCPClientStore>((set, get) => ({
  clientStatuses: {},

  setClientStatus: (serverName, status) =>
    set((state) => ({
      clientStatuses: {
        ...state.clientStatuses,
        [serverName]: status
      }
    })),

  clearClientStatus: (serverName) =>
    set((state) => {
      const newStatuses = { ...state.clientStatuses }
      delete newStatuses[serverName]
      return { clientStatuses: newStatuses }
    }),

  connectToServer: async (serverName, command, args) => {
    try {
      // 如果已经存在连接，先断开
      if (clients[serverName]) {
        await get().disconnectFromServer(serverName)
      }

      const transport = new StdioClientTransport({
        command,
        args
      })

      const client = new Client({
        name: `${serverName}-client`,
        version: '1.0.0'
      })

      await client.connect(transport)
      
      // 获取工具列表
      const tools = await client.listTools()

      clients[serverName] = client
      transports[serverName] = transport

      get().setClientStatus(serverName, {
        isConnected: true,
        tools: tools.tools.map(tool => ({
          name: tool.name,
          description: tool.description || ''
        }))
      })
    } catch (error) {
      get().setClientStatus(serverName, {
        isConnected: false,
        tools: [],
        error: error instanceof Error ? error.message : '连接失败'
      })
    }
  },

  disconnectFromServer: async (serverName) => {
    const client = clients[serverName]
    const transport = transports[serverName]

    if (client) {
      try {
        // 目前 SDK 没有提供 disconnect 方法，我们只能删除引用
        delete clients[serverName]
      } catch (error) {
        console.error(`断开客户端连接失败: ${error}`)
      }
    }

    if (transport) {
      // 目前 SDK 没有提供 destroy 方法，我们只能删除引用
      delete transports[serverName]
    }

    get().clearClientStatus(serverName)
  },

  reloadServer: async (serverName, command, args) => {
    await get().disconnectFromServer(serverName)
    await get().connectToServer(serverName, command, args)
  }
})) 