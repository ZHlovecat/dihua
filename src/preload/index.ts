import { contextBridge, ipcRenderer, webUtils } from 'electron'
import type {
  AppInfo,
  DeliverOptions,
  DeliverResult,
  HistoryStats,
  JobDetail,
  JobSummary,
  Settings,
  ShareEntriesInfo,
  ShareEntryState,
  TargetInfo,
  UpdateInfo,
} from '@shared/types'

function on(channel: string, cb: (...args: unknown[]) => void): () => void {
  const listener = (_e: Electron.IpcRendererEvent, ...args: unknown[]) => cb(...args)
  ipcRenderer.on(channel, listener)
  return () => ipcRenderer.removeListener(channel, listener)
}

const api = {
  app: {
    info: (): Promise<AppInfo> => ipcRenderer.invoke('app:info'),
    openExternal: (url: string): Promise<void> => ipcRenderer.invoke('shell:openExternal', url),
    openPath: (p: string): Promise<string> => ipcRenderer.invoke('shell:openPath', p),
    showMain: (route?: string): Promise<void> => ipcRenderer.invoke('window:showMain', route),
    closeWindow: (): Promise<void> => ipcRenderer.invoke('window:close'),
    onNav: (cb: (route: string) => void) => on('nav', (r) => cb(r as string)),
  },
  theme: {
    isDark: (): Promise<boolean> => ipcRenderer.invoke('theme:isDark'),
    onChange: (cb: (dark: boolean) => void) => on('theme:changed', (d) => cb(Boolean(d))),
  },
  files: {
    /** Electron 32 起 File.path 已移除，拖拽导入要经 webUtils 取真实路径 */
    pathFor: (file: File): string => webUtils.getPathForFile(file),
  },
  jobs: {
    get: (id: string): Promise<JobDetail | undefined> => ipcRenderer.invoke('job:get', id),
    /** 递给某个目标时会带的上下文；目标不同措辞不同 */
    prompt: (id: string, targetId: string): Promise<string | undefined> => ipcRenderer.invoke('job:prompt', id, targetId),
    deliver: (id: string, opts: DeliverOptions): Promise<DeliverResult> => ipcRenderer.invoke('job:deliver', id, opts),
    cancel: (id: string): Promise<void> => ipcRenderer.invoke('job:cancel', id),
    reveal: (id: string): Promise<void> => ipcRenderer.invoke('job:reveal', id),
    remove: (id: string, deleteFiles: boolean): Promise<void> => ipcRenderer.invoke('job:delete', id, deleteFiles),
    openConfirm: (id: string): Promise<void> => ipcRenderer.invoke('job:openConfirm', id),
    importPaths: (paths: string[]): Promise<Array<{ path: string; ok: boolean; id?: string; error?: string }>> =>
      ipcRenderer.invoke('job:importPaths', paths),
  },
  history: {
    list: (): Promise<JobSummary[]> => ipcRenderer.invoke('history:list'),
    stats: (): Promise<HistoryStats> => ipcRenderer.invoke('history:stats'),
    clear: (): Promise<void> => ipcRenderer.invoke('history:clear'),
    revealRoot: (): Promise<string> => ipcRenderer.invoke('history:revealRoot'),
    onChange: (cb: () => void) => on('history:changed', () => cb()),
  },
  targets: {
    list: (): Promise<TargetInfo[]> => ipcRenderer.invoke('targets:list'),
    setEnabled: (id: string, enabled: boolean): Promise<TargetInfo[]> => ipcRenderer.invoke('targets:setEnabled', id, enabled),
  },
  wechat: {
    /** 我的微信头像（登录页缓存），data URL；拿不到时 undefined */
    avatar: (): Promise<string | undefined> => ipcRenderer.invoke('wechat:avatar'),
  },
  entries: {
    state: (): Promise<ShareEntryState> => ipcRenderer.invoke('entries:state'),
    /** 开着的入口叫什么、是不是按目标分开列的 */
    info: (): Promise<ShareEntriesInfo> => ipcRenderer.invoke('entries:info'),
    setEnabled: (enabled: boolean): Promise<ShareEntryState> => ipcRenderer.invoke('entries:setEnabled', enabled),
    openSettings: (): Promise<void> => ipcRenderer.invoke('entries:openSettings'),
  },
  update: {
    /** 立刻查一次 GitHub Releases */
    check: (): Promise<UpdateInfo> => ipcRenderer.invoke('update:check'),
    /** 上次检查的结果；从没查过时 null */
    cached: (): Promise<UpdateInfo | null> => ipcRenderer.invoke('update:cached'),
    skip: (version: string): Promise<void> => ipcRenderer.invoke('update:skip', version),
    onChange: (cb: (info: UpdateInfo) => void) => on('update:changed', (i) => cb(i as UpdateInfo)),
  },
  settings: {
    get: (): Promise<Settings> => ipcRenderer.invoke('settings:get'),
    set: (patch: Partial<Settings>): Promise<Settings> => ipcRenderer.invoke('settings:set', patch),
    chooseWorkspace: (): Promise<string | null> => ipcRenderer.invoke('settings:chooseWorkspace'),
  },
}

export type DihuaApi = typeof api

contextBridge.exposeInMainWorld('dihua', api)
