import { contextBridge, ipcRenderer } from 'electron'

// 定义允许的 IPC 通道
const validChannels = [
  'get-mcp-tools',
  'ping',
  'chat-message',
  'chat-reply',
  'navigate-to-main',
  'go-main'
]

// Custom APIs for renderer
const api = {
  ping: () => ipcRenderer.send('ping'),
  sendMessage: (text: string) => {
    if (text === 'navigate-to-main') {
      ipcRenderer.send('navigate-to-main')
    } else {
      ipcRenderer.send('chat-message', text)
    }
  },
  onMessage: (callback: (event: any, response: string) => void) =>
    ipcRenderer.on('chat-reply', callback)
}

// 创建安全的 IPC 通信接口
const secureIPC = {
  send: (channel: string, ...args: any[]) => {
    if (validChannels.includes(channel)) {
      ipcRenderer.send(channel, ...args)
    }
  },
  on: (channel: string, callback: (...args: any[]) => void) => {
    if (validChannels.includes(channel)) {
      ipcRenderer.on(channel, callback)
    }
  },
  invoke: async (channel: string, ...args: any[]) => {
    if (validChannels.includes(channel)) {
      return await ipcRenderer.invoke(channel, ...args)
    }
    throw new Error(`Unauthorized IPC channel: ${channel}`)
  }
}

// 创建基本的 electronAPI 对象
const electronAPI = {
  platform: process.platform,
  versions: {
    node: process.versions.node,
    chrome: process.versions.chrome,
    electron: process.versions.electron
  }
}

// Use `contextBridge` APIs to expose Electron APIs to
// renderer only if context isolation is enabled, otherwise
// just add to the DOM global.
if (process.contextIsolated) {
  try {
    contextBridge.exposeInMainWorld('electron', {
      ...electronAPI,
      ipcRenderer: secureIPC
    })
    contextBridge.exposeInMainWorld('api', api)
  } catch (error) {
    console.error(error)
  }
} else {
  // @ts-ignore (define in dts)
  window.electron = {
    ...electronAPI,
    ipcRenderer: secureIPC
  }
  // @ts-ignore (define in dts)
  window.api = api
}
