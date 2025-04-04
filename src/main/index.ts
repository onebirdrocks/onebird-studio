import { app, shell, BrowserWindow, ipcMain } from 'electron'
import { join } from 'path'
import { electronApp, optimizer, is } from '@electron-toolkit/utils'
import fs from 'fs'
import icon from '../../resources/icon.png?asset'

const configPath = join(app.getPath('userData'), 'config.json')
const DEFAULT_ZOOM_LEVEL = -0.5  // 可以根据需要调整这个值

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
      sandbox: false,
      zoomFactor: 1.0
    }
  })

  // 设置初始缩放级别
  mainWindow.webContents.setZoomLevel(DEFAULT_ZOOM_LEVEL)

  mainWindow.on('ready-to-show', () => {
    mainWindow.show()
   
    if (is.dev) {
      //mainWindow.webContents.openDevTools()
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

  //console.log('🟡 Tailwind Check:')
  //console.log('  - 确保 index.css 中包含 @tailwind base/components/utilities')
  //console.log('  - tailwind.config.js 的 content 配置应包含 renderer/src/**/*.{js,ts,jsx,tsx}')

}

app.whenReady().then(() => {
  electronApp.setAppUserModelId('com.electron')

  app.on('browser-window-created', (_, window) => {
    optimizer.watchWindowShortcuts(window)
    
    window.webContents.on('did-finish-load', () => {
      window.webContents.setZoomLevel(DEFAULT_ZOOM_LEVEL)
    })
  })

  ipcMain.on('go-main', (event) => {
    const win = BrowserWindow.fromWebContents(event.sender)
    if (!win) return
  
    // 保存当前缩放级别
    const currentZoom = win.webContents.getZoomLevel()
    
    if (is.dev && process.env['ELECTRON_RENDERER_URL']) {
      win.loadURL(process.env['ELECTRON_RENDERER_URL']).then(() => {
        // 加载完成后恢复缩放级别
        win.webContents.setZoomLevel(DEFAULT_ZOOM_LEVEL)
      })
    } else {
      win.loadFile(join(__dirname, '../renderer/index.html')).then(() => {
        // 加载完成后恢复缩放级别
        win.webContents.setZoomLevel(DEFAULT_ZOOM_LEVEL)
      })
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
