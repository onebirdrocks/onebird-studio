export interface IElectronAPI {
  ping: () => void
  sendMessage: (text: string) => void
  onMessage: (callback: (event: any, response: string) => void) => void
}

export interface IMCPSDK {
  initialize: () => Promise<{ success: boolean; error?: string }>
  sendPrompt: (prompt: string) => Promise<any>
  getResponse: () => Promise<any>
}

declare global {
  interface Window {
    electron: IElectronAPI
    api: IElectronAPI
    mcpSDK: IMCPSDK
  }
} 