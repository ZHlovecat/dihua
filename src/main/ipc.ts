import { app, BrowserWindow, dialog, ipcMain, nativeTheme, shell } from 'electron'
import type { AppInfo, DeliverOptions, Settings } from '@shared/types'
import { openExtensionsSettings, setShareEntryEnabled, shareEntriesInfo, shareEntryState, syncShareEntries } from './entries'
import { cancelJob, clearHistory, deleteJob, deliverJob, getJobDetail, handoffPromptFor, historyStats, importZip, revealJob } from './jobs'
import { appVersion } from './paths'
import { getSettings, listHistory, readUpdateCache, updateSettings } from './store'
import { describeTargets, setTargetEnabled } from './targets/registry'
import { ownWeChatAvatar } from './wechatAvatar'
import { checkForUpdates } from './update'
import { showConfirmWindow, showMainWindow } from './windows'
import { ensureWorkspaceRoot } from './workspace'
import log from './log'

export function registerIpc(): void {
  ipcMain.handle('app:info', (): AppInfo => ({
    version: appVersion(),
    userDataDir: app.getPath('userData'),
    logFile: log.transports.file.getFile().path,
    platform: process.platform,
    isPackaged: app.isPackaged,
  }))
  ipcMain.handle('theme:isDark', () => nativeTheme.shouldUseDarkColors)

  ipcMain.handle('job:get', (_e, id: string) => getJobDetail(id))
  ipcMain.handle('job:prompt', (_e, id: string, targetId: string) => handoffPromptFor(id, targetId))
  ipcMain.handle('job:deliver', (_e, id: string, opts: DeliverOptions) => deliverJob(id, opts))
  ipcMain.handle('job:cancel', (_e, id: string) => cancelJob(id))
  ipcMain.handle('job:reveal', (_e, id: string) => revealJob(id))
  ipcMain.handle('job:delete', (_e, id: string, deleteFiles: boolean) => deleteJob(id, deleteFiles))
  ipcMain.handle('job:openConfirm', (_e, id: string) => {
    showConfirmWindow(id)
  })
  ipcMain.handle('job:importPaths', async (_e, paths: string[]) => {
    const results: Array<{ path: string; ok: boolean; id?: string; error?: string }> = []
    for (const p of paths) {
      try {
        const job = await importZip(p, 'drag')
        results.push({ path: p, ok: true, id: job.id })
        showConfirmWindow(job.id)
      } catch (err) {
        results.push({ path: p, ok: false, error: err instanceof Error ? err.message : String(err) })
      }
    }
    return results
  })

  ipcMain.handle('history:list', () => listHistory())
  ipcMain.handle('history:stats', () => historyStats())
  ipcMain.handle('history:clear', () => clearHistory())
  ipcMain.handle('history:revealRoot', () => {
    const root = getSettings().workspaceRoot
    ensureWorkspaceRoot(root)
    return shell.openPath(root)
  })

  ipcMain.handle('targets:list', () => describeTargets())
  ipcMain.handle('targets:setEnabled', async (_e, id: string, enabled: boolean) => {
    const targets = await setTargetEnabled(id, enabled)
    void syncShareEntries() // 「递给 X」入口跟着目标开关走
    return targets
  })
  ipcMain.handle('wechat:avatar', () => ownWeChatAvatar())

  ipcMain.handle('update:check', () => checkForUpdates())
  ipcMain.handle('update:cached', () => readUpdateCache())
  ipcMain.handle('update:skip', (_e, version: string) => {
    updateSettings({ skippedUpdateVersion: version })
  })

  ipcMain.handle('entries:state', () => shareEntryState())
  ipcMain.handle('entries:info', () => shareEntriesInfo())
  ipcMain.handle('entries:setEnabled', (_e, enabled: boolean) => setShareEntryEnabled(enabled))
  ipcMain.handle('entries:openSettings', () => openExtensionsSettings())

  ipcMain.handle('settings:get', () => getSettings())
  ipcMain.handle('settings:set', (_e, patch: Partial<Settings>) => {
    const next = updateSettings(patch)
    if (patch.workspaceRoot) ensureWorkspaceRoot(next.workspaceRoot)
    if (patch.themeMode) nativeTheme.themeSource = patch.themeMode // 触发 nativeTheme 'updated'，各窗口随之切换 antd 算法
    // 直接递出去 / 默认目标变了，共享菜单里的入口要跟着换
    if ('skipConfirm' in patch || 'defaultTargetId' in patch || 'disabledTargetIds' in patch) void syncShareEntries()
    return next
  })
  ipcMain.handle('settings:chooseWorkspace', async (e) => {
    const win = BrowserWindow.fromWebContents(e.sender) ?? undefined
    const res = await dialog.showOpenDialog(win!, {
      title: '选择递话工作区目录',
      properties: ['openDirectory', 'createDirectory'],
      defaultPath: getSettings().workspaceRoot,
    })
    return res.canceled ? null : res.filePaths[0]
  })

  ipcMain.handle('shell:openExternal', (_e, url: string) => {
    if (/^https?:\/\//.test(url)) return shell.openExternal(url)
    return undefined
  })
  ipcMain.handle('shell:openPath', (_e, p: string) => shell.openPath(p))
  ipcMain.handle('window:close', (e) => BrowserWindow.fromWebContents(e.sender)?.close())
  ipcMain.handle('window:showMain', (_e, route?: string) => {
    showMainWindow(route)
  })
}
