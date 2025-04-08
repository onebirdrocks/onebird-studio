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

interface MCPClientWrapper {
  client: Client
  transport: StdioClientTransport
  isConnecting: boolean
  isConnected: boolean
  lastError?: Error
}

// MCP Clients map to store initialized clients
const mcpClients: Map<string, MCPClientWrapper> = new Map();

// 连接超时时间（毫秒）
const CONNECTION_TIMEOUT = 10000;

// 创建一个带超时的 Promise
function withTimeout<T>(promise: Promise<T>, timeoutMs: number, errorMessage: string): Promise<T> {
  const timeoutPromise = new Promise<T>((_, reject) => {
    setTimeout(() => reject(new Error(errorMessage)), timeoutMs);
  });
  return Promise.race([promise, timeoutPromise]);
}

// 初始化单个客户端
async function initializeClient(name: string, config: MCPServerConfig): Promise<void> {
  try {
    console.log(`Initializing client for server: ${name}`);
    
    // 如果已经有正在连接的客户端，跳过
    const existingClient = mcpClients.get(name);
    if (existingClient?.isConnecting) {
      console.log(`Client ${name} is already connecting, skipping`);
      return;
    }

    // 如果是已连接的客户端，保持现有连接
    if (existingClient?.isConnected) {
      console.log(`Client ${name} is already connected, keeping existing connection`);
      return;
    }

    const transport = new StdioClientTransport({
      command: config.command,
      args: config.args
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

    // 创建客户端包装器
    const wrapper: MCPClientWrapper = {
      client,
      transport,
      isConnecting: true,
      isConnected: false
    };
    mcpClients.set(name, wrapper);

    try {
      console.log(`Attempting to connect client for server: ${name}`);
      await withTimeout(
        client.connect(transport),
        CONNECTION_TIMEOUT,
        `Connection timeout for server: ${name}`
      );
      wrapper.isConnected = true;
      console.log(`Successfully connected client for server: ${name}`);
    } catch (error) {
      wrapper.lastError = error as Error;
      console.error(`Failed to connect client for server ${name}:`, error);
      // 如果连接失败，从 map 中移除
      mcpClients.delete(name);
    } finally {
      wrapper.isConnecting = false;
    }
  } catch (error) {
    console.error(`Error initializing client for server ${name}:`, error);
    // 确保在出错时从 map 中移除
    mcpClients.delete(name);
    throw error;
  }
}

// Initialize clients from config
async function loadClients(configStr: string): Promise<void> {
  try {
    console.log('Starting to load MCP clients with config:', configStr);
    const config = JSON.parse(configStr);
    if (!config.mcpServers || typeof config.mcpServers !== 'object') {
      throw new Error('Invalid config: missing mcpServers object');
    }

    // 保存当前已连接的客户端列表
    const connectedClients = new Map(
      Array.from(mcpClients.entries())
        .filter(([_, wrapper]) => wrapper.isConnected)
    );

    // 初始化新的客户端（并行处理）
    const initPromises = Object.entries(config.mcpServers).map(([name, serverConfig]) => 
      initializeClient(name, serverConfig as MCPServerConfig)
        .catch(error => {
          console.error(`Failed to initialize client for server ${name}:`, error);
          // 不抛出错误，让其他客户端继续初始化
        })
    );

    // 等待所有客户端初始化完成
    await Promise.all(initPromises);

    // 恢复之前已连接的客户端
    for (const [name, wrapper] of connectedClients.entries()) {
      if (!mcpClients.has(name)) {
        mcpClients.set(name, wrapper);
      }
    }

    console.log('Finished loading all MCP clients');
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
  const wrapper = mcpClients.get(serverName);
  if (!wrapper) {
    console.log(`No client found for server: ${serverName}`);
    return null;
  }
  if (!wrapper.isConnected) {
    console.log(`Client for server ${serverName} is not connected. Last error:`, wrapper.lastError);
    return null;
  }
  return wrapper.client;
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
      const toolsResponse = await withTimeout(
        client.listTools(),
        CONNECTION_TIMEOUT,
        `Tools listing timeout for server: ${serverName}`
      );
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

// 初始化 ollama 客户端
export async function initializeOllamaClient(): Promise<void> {
  const ollamaConfig: MCPServerConfig = {
    command: 'ollama',
    args: ['serve', '--verbose']
  };

  try {
    // 先检查 ollama 服务是否已经在运行
    const response = await fetch('http://localhost:11434/api/version');
    if (response.ok) {
      console.log('Ollama service is already running');
      // 创建客户端连接
      await initializeClient('ollama', ollamaConfig);
      return;
    }
  } catch (error) {
    console.log('Ollama service is not running, attempting to start...');
  }

  // 如果服务未运行，启动新的服务
  await initializeClient('ollama', ollamaConfig);
}

export { loadClients, getMCPClientByName }; 