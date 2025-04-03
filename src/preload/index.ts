import { contextBridge, ipcRenderer } from 'electron'
import { electronAPI } from '@electron-toolkit/preload'

// Custom APIs for renderer
const api = {}

// ✅ 安全地注入 electron/ipcRenderer
if (!('electron' in window)) {
  contextBridge.exposeInMainWorld('electron', electronAPI)
}

// ✅ 示例：注入自定义 API（可选）
if (!('api' in window)) {
  contextBridge.exposeInMainWorld('api', {
    ping: () => {
      ipcRenderer.send('ping')
    }
  })
}

// Use `contextBridge` APIs to expose Electron APIs to
// renderer only if context isolation is enabled, otherwise
// just add to the DOM global.
if (process.contextIsolated) {
  try {
    contextBridge.exposeInMainWorld('electron', electronAPI)
    contextBridge.exposeInMainWorld('api', api)
  } catch (error) {
    console.error(error)
  }
} else {
  // @ts-ignore (define in dts)
  window.electron = electronAPI
  // @ts-ignore (define in dts)
  window.api = api
}

export {}
