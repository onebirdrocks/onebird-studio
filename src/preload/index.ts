import { contextBridge, ipcRenderer } from 'electron'
import { electronAPI } from '@electron-toolkit/preload'

contextBridge.exposeInMainWorld('electron', electronAPI)

contextBridge.exposeInMainWorld('api', {
  ping: () => ipcRenderer.send('ping'),
  sendMessage: (text: string) => ipcRenderer.send('chat-message', text),
  onMessage: (callback: (event: any, response: string) => void) =>
    ipcRenderer.on('chat-reply', callback)
})
