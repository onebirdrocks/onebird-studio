const { Client } = require('@modelcontextprotocol/sdk/client/index.js')
const { StdioClientTransport } = require('@modelcontextprotocol/sdk/client/stdio.js')
const { join } = require('path')

export class ModelContextProtocolSDK {
  private client: typeof Client
  private transport: typeof StdioClientTransport

  constructor() {
    const serverPath = join(__dirname, 'server.js')
    this.transport = new StdioClientTransport({
      command: 'node',
      args: [serverPath]
    })

    this.client = new Client({
      name: 'onebird-studio',
      version: '1.0.0'
    })
  }

  async initialize(): Promise<void> {
    try {
      await this.client.connect(this.transport)
    } catch (error) {
      console.error('MCP SDK 连接失败:', error)
      throw error
    }
  }

  async listPrompts() {
    try {
      return await this.client.listPrompts()
    } catch (error) {
      console.error('获取提示词列表失败:', error)
      throw error
    }
  }

  async getPrompt(name: string, args: Record<string, any>) {
    try {
      return await this.client.getPrompt({
        name,
        arguments: args
      })
    } catch (error) {
      console.error('获取提示词失败:', error)
      throw error
    }
  }

  async listResources() {
    try {
      return await this.client.listResources()
    } catch (error) {
      console.error('获取资源列表失败:', error)
      throw error
    }
  }

  async readResource(uri: string) {
    try {
      return await this.client.readResource({ uri })
    } catch (error) {
      console.error('读取资源失败:', error)
      throw error
    }
  }

  async callTool(name: string, args: Record<string, any>) {
    try {
      return await this.client.callTool({
        name,
        arguments: args
      })
    } catch (error) {
      console.error('调用工具失败:', error)
      throw error
    }
  }
} 