import { ipcMain } from 'electron'
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StdioClientTransport } from "@modelcontextprotocol/sdk/client/stdio.js";

interface MCPToolInfo {
  name: string
  description: string
}

interface MCPServerConfig {
  command: string
  args: string[]
}

// MCP Clients map to store initialized clients
const mcpClients: Map<string, Client> = new Map();

// Initialize clients from config
async function loadClients(configStr: string): Promise<void> {
  try {
    console.log('Starting to load MCP clients with config:', configStr);
    const config = JSON.parse(configStr);
    if (!config.mcpServers || typeof config.mcpServers !== 'object') {
      throw new Error('Invalid config: missing mcpServers object');
    }

    // Clear existing clients
    for (const [name, client] of mcpClients.entries()) {
      try {
        console.log(`Disconnecting client for server: ${name}`);
        // 注意：如果 Client 类型没有 disconnect 方法，我们就直接删除它
      } catch (error) {
        console.warn(`Failed to disconnect client for server ${name}:`, error);
      }
    }
    mcpClients.clear();

    // Initialize new clients
    for (const [name, serverConfig] of Object.entries(config.mcpServers)) {
      console.log(`Initializing client for server: ${name}`);
      const typedConfig = serverConfig as MCPServerConfig;
      
      console.log(`Creating transport with command: ${typedConfig.command}, args:`, typedConfig.args);
      const transport = new StdioClientTransport({
        command: typedConfig.command,
        args: typedConfig.args
      });

      const client = new Client(
        {
          name: name,
          version: "1.0.0"
        },
        {
          capabilities: {
            prompts: {},
            resources: {},
            tools: {}
          }
        }
      );

      try {
        console.log(`Attempting to connect client for server: ${name}`);
        await client.connect(transport);
        console.log(`Successfully connected client for server: ${name}`);
        mcpClients.set(name, client);
      } catch (error) {
        console.error(`Failed to connect client for server ${name}:`, error);
        throw error;
      }
    }
    console.log('Successfully loaded all MCP clients');
  } catch (error) {
    console.error('Failed to load MCP clients:', error);
    throw error;
  }
}

// Get client by server name
async function getMCPClientByName(serverName: string): Promise<Client | null> {
  console.log(`Getting client for server: ${serverName}`);
  if (mcpClients.size === 0) {
    console.log('No MCP clients initialized');
    return null;
  }
  const client = mcpClients.get(serverName);
  console.log(`Client ${client ? 'found' : 'not found'} for server: ${serverName}`);
  return client || null;
}

// Mock tools data
const mockTools: Record<string, MCPToolInfo[]> = {
  'blender': [
    { name: 'create_cube', description: '创建一个立方体' },
    { name: 'create_sphere', description: '创建一个球体' },
    { name: 'render_scene', description: '渲染当前场景' }
  ],
  'weather': [
    { name: 'get_current_weather', description: '获取当前天气' },
    { name: 'get_forecast', description: '获取天气预报' }
  ],
  'ebook-mcp': [
    { name: 'convert_epub', description: '转换EPUB格式' },
    { name: 'extract_metadata', description: '提取元数据' }
  ]
}

export function setupMockMCPService() {
  // 处理配置更新
  ipcMain.handle('update-mcp-config', async (_event, configStr: string) => {
    try {
      console.log('Received request to update MCP config');
      await loadClients(configStr);
      return { success: true };
    } catch (error: any) {
      console.error('Failed to update MCP config:', error);
      return { 
        success: false, 
        error: error.message,
        details: error.code ? `Error code: ${error.code}` : undefined
      };
    }
  });

  // 获取服务器工具列表
  ipcMain.handle('get-mcp-tools', async (_event, serverName: string) => {
    try {
      console.log(`Attempting to get tools for server: ${serverName}`);
      const client = await getMCPClientByName(serverName);
      if (!client) {
        throw new Error(`No client found for server: ${serverName}`);
      }
      
      console.log(`Listing tools for server: ${serverName}`);
      const toolsResponse = await client.listTools();
      console.log(`Raw tools response for server ${serverName}:`, toolsResponse);

      // 检查返回的数据结构
      if (!toolsResponse || typeof toolsResponse !== 'object') {
        console.warn(`Invalid tools response for server ${serverName}:`, toolsResponse);
        return [];
      }

      // 尝试从不同的可能的数据结构中提取工具列表
      let toolsList: Array<{ name: string; description?: string }> = [];
      
      if (Array.isArray(toolsResponse)) {
        toolsList = toolsResponse;
      } else if (toolsResponse.tools && Array.isArray(toolsResponse.tools)) {
        toolsList = toolsResponse.tools;
      } else if (toolsResponse.result && Array.isArray(toolsResponse.result)) {
        toolsList = toolsResponse.result;
      } else {
        // 如果是对象，尝试将其转换为数组
        const tools = Object.entries(toolsResponse).map(([name, tool]) => {
          if (typeof tool === 'object' && tool !== null) {
            return {
              name,
              description: (tool as any).description || '无描述'
            };
          }
          return { name, description: '无描述' };
        });
        toolsList = tools;
      }

      console.log(`Processed tools list for server ${serverName}:`, toolsList);
      
      // 确保每个工具都有必要的属性
      return toolsList.map(tool => ({
        name: typeof tool === 'string' ? tool : (tool.name || ''),
        description: typeof tool === 'string' ? '无描述' : (tool.description || '无描述')
      }));
    } catch (error: any) {
      console.error(`Failed to get MCP tools for server ${serverName}:`, error);
      return [];
    }
  });
}

export { loadClients, getMCPClientByName }; 