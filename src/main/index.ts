import { app, shell, BrowserWindow, ipcMain } from 'electron'
import { join } from 'path'
import { electronApp, optimizer, is } from '@electron-toolkit/utils'
import fs from 'fs'
import icon from '../../resources/icon.png?asset'
import installExtension, { REACT_DEVELOPER_TOOLS } from 'electron-devtools-installer'
import { setupMockMCPService } from './mockMCPService'

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

let devToolsInstalled = false;

async function checkDevToolsStatus(window: BrowserWindow) {
  if (!is.dev) return;

  try {
    // 检查扩展是否已安装
    const extensions = await window.webContents.session.getAllExtensions();
    console.log('已安装的扩展:', extensions);

    // 检查 React DevTools 是否在已安装的扩展中
    const hasReactDevTools = extensions.some(ext => ext.name === 'React Developer Tools');
    console.log('React DevTools 是否已安装:', hasReactDevTools);

    // 注入检查脚本
    const checkResult = await window.webContents.executeJavaScript(`
      new Promise(resolve => {
        if (window.__REACT_DEVTOOLS_GLOBAL_HOOK__) {
          console.log('React DevTools 已连接');
          resolve(true);
        } else {
          console.log('React DevTools 未连接');
          resolve(false);
        }
      });
    `);

    console.log('React DevTools 连接状态:', checkResult);
    return checkResult;
  } catch (err) {
    console.error('检查 DevTools 状态时出错:', err);
    return false;
  }
}

async function installDevTools() {
  if (!is.dev || devToolsInstalled) return;

  try {
    console.log('开始安装 React DevTools...');
    const name = await installExtension(REACT_DEVELOPER_TOOLS, {
      loadExtensionOptions: {
        allowFileAccess: true
      }
    });
    console.log('React DevTools 安装成功:', name);
    devToolsInstalled = true;

    // 强制刷新所有窗口以确保 DevTools 生效
    BrowserWindow.getAllWindows().forEach(window => {
      window.webContents.reload();
    });

    return name;
  } catch (err) {
    console.error('安装 React DevTools 时出错:', err);
    return null;
  }
}

function createWindow(): void {
  const mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    show: false,
    autoHideMenuBar: true,
    ...(process.platform === 'linux' ? { icon } : {}),
    webPreferences: {
      preload: join(__dirname, '../../out/preload/index.js'),
      sandbox: true,
      contextIsolation: true,
      webSecurity: true,
      allowRunningInsecureContent: false,
      nodeIntegration: false
    }
  })

  // 设置 CSP
  mainWindow.webContents.session.webRequest.onHeadersReceived((details, callback) => {
    // 开发环境和生产环境使用不同的 CSP 配置
    const csp = is.dev
      ? [
          "default-src 'self';" +
          "script-src 'self' 'unsafe-inline' 'unsafe-eval';" +
          "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com;" +
          "font-src 'self' https://fonts.gstatic.com;" +
          "img-src 'self' data: https:;" +
          "connect-src 'self' https: ws: wss: http://localhost:11434 http://127.0.0.1:11434;"
        ]
      : [
          "default-src 'self';" +
          "script-src 'self';" +
          "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com;" +
          "font-src 'self' https://fonts.gstatic.com;" +
          "img-src 'self' data: https:;" +
          "connect-src 'self' https: http://localhost:11434 http://127.0.0.1:11434;"
        ];

    callback({
      responseHeaders: {
        ...details.responseHeaders,
        'Content-Security-Policy': csp
      }
    })
  })

  // 设置初始缩放级别
  mainWindow.webContents.setZoomLevel(DEFAULT_ZOOM_LEVEL)

  mainWindow.on('ready-to-show', () => {
    mainWindow.show()
   
    if (is.dev) {
      mainWindow.webContents.openDevTools()
      // 检查 DevTools 状态
      setTimeout(async () => {
        const isConnected = await checkDevToolsStatus(mainWindow);
        if (!isConnected) {
          console.log('尝试重新安装 DevTools...');
          await installDevTools();
          await checkDevToolsStatus(mainWindow);
        }
      }, 2000); // 给一些时间让页面加载
    }
  })

  mainWindow.webContents.setWindowOpenHandler((details) => {
    shell.openExternal(details.url)
    return { action: 'deny' }
  })

  // 加载欢迎页面
  const welcomePath = join(__dirname, '../../resources/welcome.html')
  mainWindow.loadFile(welcomePath)

  // 处理导航事件
  ipcMain.on('navigate-to-main', () => {
    const rendererUrl = process.env['ELECTRON_RENDERER_URL']
    if (is.dev && rendererUrl) {
      mainWindow.loadURL(rendererUrl).catch(console.error)
    } else {
      const indexPath = join(__dirname, '../renderer/index.html')
      mainWindow.loadFile(indexPath).catch(console.error)
    }
  })
}

app.whenReady().then(async () => {
  // 确保在其他操作之前安装 DevTools
  if (is.dev) {
    await installDevTools();
  }

  electronApp.setAppUserModelId('com.electron')
  setupMockMCPService()

  app.on('browser-window-created', (_, window) => {
    optimizer.watchWindowShortcuts(window)
    
    window.webContents.on('did-finish-load', async () => {
      window.webContents.setZoomLevel(DEFAULT_ZOOM_LEVEL)
      if (is.dev) {
        await checkDevToolsStatus(window);
      }
    })
  })

  ipcMain.on('go-main', async (event) => {
    const win = BrowserWindow.fromWebContents(event.sender)
    if (!win) return
  
    const rendererUrl = process.env['ELECTRON_RENDERER_URL']
    if (is.dev && rendererUrl) {
      await win.loadURL(rendererUrl)
      win.webContents.setZoomLevel(DEFAULT_ZOOM_LEVEL)
    } else {
      await win.loadFile(join(__dirname, '../renderer/index.html'))
      win.webContents.setZoomLevel(DEFAULT_ZOOM_LEVEL)
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
