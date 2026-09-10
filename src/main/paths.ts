import { app } from 'electron'
import { join } from 'node:path'

/** 文件系统里一律用英文名：~/Library/Application Support/dihua、~/Library/Logs/dihua、~/Documents/dihua */
export const APP_NAME = 'dihua'
/** 界面上显示的名字 */
export const APP_DISPLAY_NAME = '递话'

/** 开发态 app.getVersion() 返回的是 Electron 的版本，用 pnpm 注入的 package.json 版本代替 */
export function appVersion(): string {
  return app.isPackaged ? app.getVersion() : (process.env.npm_package_version ?? app.getVersion())
}

export function userDataDir(): string {
  return app.getPath('userData')
}

export function incomingDir(): string {
  return join(userDataDir(), 'incoming')
}

export function tmpDir(): string {
  return join(userDataDir(), 'tmp')
}

export function defaultWorkspaceRoot(): string {
  return join(app.getPath('documents'), APP_NAME)
}

export function settingsFile(): string {
  return join(userDataDir(), 'settings.json')
}

export function historyFile(): string {
  return join(userDataDir(), 'history.json')
}

export function updateFile(): string {
  return join(userDataDir(), 'update.json')
}
