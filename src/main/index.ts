import { app, shell, BrowserWindow, ipcMain } from 'electron'
import { join } from 'path'
import { electronApp, optimizer, is } from '@electron-toolkit/utils'
import fs from 'fs'
import icon from '../../resources/icon.png?asset'

const configPath = join(app.getPath('userData'), 'config.json')

function isFirstLaunch(): boolean {
  try {
    const config = JSON.parse(fs.readFileSync(configPath, 'utf-8'))
    return !config.hasShownWelcome
  } catch (err) {
    return true
  }
}

function markWelcomeShown() {
  const config = { hasShownWelcome: true }
  fs.writeFileSync(configPath, JSON.stringify(config), 'utf-8')
}

function createWindow(): void {
  const mainWindow = new BrowserWindow({
    width: 900,
    height: 670,
    show: false,
    autoHideMenuBar: true,
    ...(process.platform === 'linux' ? { icon } : {}),
    webPreferences: {
      //preload: join(__dirname, '../preload/index.js'),
      preload: join(__dirname, '../../out/preload/index.js'),
      sandbox: false
    }
  })

  mainWindow.on('ready-to-show', () => {
    mainWindow.show()
   
    if (is.dev) {
      mainWindow.webContents.openDevTools()
    }
  })

  mainWindow.webContents.setWindowOpenHandler((details) => {
    shell.openExternal(details.url)
    return { action: 'deny' }
  })

  if (true) {  // if isFirstLaunch() 如果是第一次启动，则显示欢迎页面 
    mainWindow.loadFile(join(__dirname, '../../resources/welcome.html'))
    markWelcomeShown()
  } else {
    if (is.dev && process.env['ELECTRON_RENDERER_URL']) {
      mainWindow.loadURL(process.env['ELECTRON_RENDERER_URL'])
    } else {
      mainWindow.loadFile(join(__dirname, '../renderer/index.html'))
    }
  }

  console.log('🟡 Tailwind Check:')
  console.log('  - 确保 index.css 中包含 @tailwind base/components/utilities')
  console.log('  - tailwind.config.js 的 content 配置应包含 renderer/src/**/*.{js,ts,jsx,tsx}')

}

app.whenReady().then(() => {
  electronApp.setAppUserModelId('com.electron')

  app.on('browser-window-created', (_, window) => {
    optimizer.watchWindowShortcuts(window)
  })

  ipcMain.on('go-main', (event) => {
    const win = BrowserWindow.fromWebContents(event.sender)
    if (!win) return
  
    if (is.dev && process.env['ELECTRON_RENDERER_URL']) {
      win.loadURL(process.env['ELECTRON_RENDERER_URL'])
    } else {
      win.loadFile(join(__dirname, '../renderer/index.html'))
    }
  })
  

  createWindow()

  app.on('activate', function () {
    if (BrowserWindow.getAllWindows().length === 0) createWindow()
  })
})

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit()
  }
})
