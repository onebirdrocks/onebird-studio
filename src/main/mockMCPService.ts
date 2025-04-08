import { ipcMain } from 'electron'

interface MCPToolInfo {
  name: string
  description: string
}

interface MCPServerConfig {
  command: string
  args: string[]
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
  ipcMain.handle('get-mcp-tools', async (_event, config: MCPServerConfig) => {
    // 根据command来决定返回哪些mock数据
    const serverType = config.command === 'uvx' && config.args[0] === 'blender-mcp' 
      ? 'blender'
      : config.args.includes('weather.py') 
        ? 'weather'
        : 'ebook-mcp'

    return mockTools[serverType] || []
  })
} 