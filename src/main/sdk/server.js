const { Server } = require('@modelcontextprotocol/sdk/server/index.js')

const server = new Server({
  name: 'onebird-studio-server',
  version: '1.0.0',
  prompts: [
    {
      name: 'chat',
      description: '与 AI 助手对话',
      arguments: {
        type: 'object',
        properties: {
          message: {
            type: 'string',
            description: '用户的消息'
          }
        },
        required: ['message']
      }
    }
  ],
  resources: [
    {
      uri: 'file://workspace',
      description: '工作区目录'
    }
  ],
  tools: [
    {
      name: 'search',
      description: '搜索文件',
      arguments: {
        type: 'object',
        properties: {
          query: {
            type: 'string',
            description: '搜索关键词'
          }
        },
        required: ['query']
      }
    }
  ]
})

server.on('prompt', async (request) => {
  // 处理提示词请求
  if (request.name === 'chat') {
    return {
      response: `收到消息: ${request.arguments.message}`
    }
  }
})

server.on('resource', async (request) => {
  // 处理资源请求
  if (request.uri === 'file://workspace') {
    return {
      content: '工作区内容'
    }
  }
})

server.on('tool', async (request) => {
  // 处理工具调用
  if (request.name === 'search') {
    return {
      result: `搜索结果: ${request.arguments.query}`
    }
  }
})

server.listen() 