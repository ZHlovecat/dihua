import { BrowserWindow, nativeTheme, shell } from 'electron'
import { join } from 'node:path'

let mainWindow: BrowserWindow | null = null
const confirmWindows = new Map<string, BrowserWindow>()

/** 与 antd 默认主题的 colorBgContainer 一致，避免窗口出现时闪白/闪黑 */
function ground(): string {
  return nativeTheme.shouldUseDarkColors ? '#141414' : '#FFFFFF'
}

function baseOptions(): Electron.BrowserWindowConstructorOptions {
  return {
    show: false,
    titleBarStyle: 'hiddenInset',
    trafficLightPosition: { x: 14, y: 14 },
    backgroundColor: ground(),
    webPreferences: {
      preload: join(__dirname, '../preload/index.js'),
      contextIsolation: true,
      sandbox: true,
      nodeIntegration: false,
    },
  }
}

function load(win: BrowserWindow, route: string): void {
  const devUrl = process.env.ELECTRON_RENDERER_URL
  if (devUrl) void win.loadURL(`${devUrl}#${route}`)
  else void win.loadFile(join(__dirname, '../renderer/index.html'), { hash: route })
  win.webContents.setWindowOpenHandler(({ url }) => {
    void shell.openExternal(url)
    return { action: 'deny' }
  })
  win.once('ready-to-show', () => win.show())
}

/** 设置窗口：默认 780×560，可自由缩放 */
export function showMainWindow(route = '/history'): BrowserWindow {
  if (mainWindow && !mainWindow.isDestroyed()) {
    mainWindow.show()
    mainWindow.focus()
    mainWindow.webContents.send('nav', route)
    return mainWindow
  }
  mainWindow = new BrowserWindow({
    ...baseOptions(),
    width: 780,
    height: 560,
    minWidth: 640,
    minHeight: 440,
    title: '递话',
  })
  load(mainWindow, route)
  mainWindow.on('closed', () => {
    mainWindow = null
  })
  return mainWindow
}

export function showConfirmWindow(jobId: string): BrowserWindow {
  const existing = confirmWindows.get(jobId)
  if (existing && !existing.isDestroyed()) {
    existing.show()
    existing.focus()
    return existing
  }
  const win = new BrowserWindow({
    ...baseOptions(),
    width: 640,
    height: 600,
    minWidth: 600,
    minHeight: 520,
    title: '递话',
  })
  load(win, `/confirm/${jobId}`)
  win.on('closed', () => confirmWindows.delete(jobId))
  confirmWindows.set(jobId, win)
  return win
}

export function broadcast(channel: string, ...args: unknown[]): void {
  for (const w of BrowserWindow.getAllWindows()) {
    if (!w.isDestroyed()) w.webContents.send(channel, ...args)
  }
}

export function hasVisibleWindows(): boolean {
  return BrowserWindow.getAllWindows().some((w) => !w.isDestroyed() && w.isVisible())
}
