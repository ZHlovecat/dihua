import { app, nativeTheme, Notification } from 'electron'
import { basename, join, sep } from 'node:path'
import { APP_DISPLAY_NAME, APP_NAME, appVersion } from './paths'
import { registerBundledShareExtensions, SHARE_EXTENSION_ID, syncShareEntries } from './entries'
import { deleteJob, deliverJob, housekeeping, importZip } from './jobs'
import { registerIpc } from './ipc'
import { getSettings } from './store'
import { describeTargets } from './targets/registry'
import { scheduleAutoCheck } from './update'
import { broadcast, hasVisibleWindows, showConfirmWindow, showMainWindow } from './windows'
import log from './log'

// 文件系统里用英文名（~/Library/Application Support/dihua、~/Library/Logs/dihua），开发态与打包态共用
app.setName(APP_NAME)
// 开发/截图用：指定一个隔离的数据目录，不碰正式版的设置与记录
if (process.env.DIHUA_USER_DATA && !app.isPackaged) app.setPath('userData', process.env.DIHUA_USER_DATA)

// ---- 共享菜单 / 打开方式调起：open-file、open-url 可能早于 ready，必须在这里就注册 ----
const pendingFiles: string[] = []
const pendingUrls: string[] = []
let ready = false

app.on('open-file', (event, filePath) => {
  event.preventDefault()
  log.info(`[open-file] ${filePath}`)
  if (ready) void handleIncomingFile(filePath, 'open-with')
  else pendingFiles.push(filePath)
})

app.on('open-url', (event, url) => {
  event.preventDefault()
  log.info(`[open-url] ${url}`)
  if (ready) void handleIncomingUrl(url)
  else pendingUrls.push(url)
})

if (!app.requestSingleInstanceLock()) {
  app.quit()
} else {
  app.on('second-instance', (_e, argv) => {
    const zips = argv.filter((a) => a.toLowerCase().endsWith('.zip'))
    if (zips.length) for (const z of zips) void handleIncomingFile(z, 'argv')
    else showMainWindow()
  })
}

// 各 Share Extension 的沙盒容器：~/Library/Containers/app.dihua.desktop.share[.<target>]/Data/tmp
const shareContainersPrefix = join(app.getPath('home'), 'Library', 'Containers', SHARE_EXTENSION_ID)

/**
 * 收到一个 zip。targetId 来自「递给 X」共享入口（dihua://import?…&target=X），有它就直接递给 X；
 * 没有时看「收到记录后直接递出去」：开了递给默认目标，否则弹确认窗。
 */
async function handleIncomingFile(filePath: string, source: 'share' | 'open-with' | 'argv', targetId?: string): Promise<void> {
  try {
    const removeSourceAfterCopy = filePath.startsWith(shareContainersPrefix + sep) || filePath.startsWith(shareContainersPrefix + '.')
    const job = await importZip(filePath, source, { removeSourceAfterCopy })
    const settings = getSettings()
    const directId = targetId ?? (settings.skipConfirm ? settings.defaultTargetId : undefined)
    if (directId) {
      const targets = await describeTargets()
      const target = targets.find((t) => t.id === directId)
      if (target?.available && target.enabled) {
        const res = await deliverJob(job.id, { targetId: directId })
        if (res.ok) {
          notify(`已递给 ${res.targetName}`, `「${job.title}」${job.counts.messages} 条记录。${res.nextStep}`)
          broadcast('history:changed')
          return
        }
        notify('没递出去', res.error)
      } else if (targetId) {
        notify('这个目标现在不可用', `${target?.name ?? targetId} 未安装或已停用，改为弹出确认窗。`)
      }
    }
    showConfirmWindow(job.id)
    broadcast('history:changed')
  } catch (err) {
    log.error('[open-file] import failed', err)
    notify('递话无法处理这个文件', `${basename(filePath)}：${err instanceof Error ? err.message : String(err)}`)
    showMainWindow('/history')
  }
}

async function handleIncomingUrl(url: string): Promise<void> {
  // dihua://import?path=/abs/a.zip&path=/abs/b.zip&source=share  —— Share Extension 与自动化都走这里
  try {
    const u = new URL(url)
    if (u.host === 'import') {
      const paths = u.searchParams.getAll('path').filter(Boolean)
      const source = u.searchParams.get('source') === 'share' ? 'share' : 'argv'
      const target = u.searchParams.get('target') || undefined
      if (paths.length) {
        for (const p of paths) await handleIncomingFile(p, source, target)
        return
      }
    }
  } catch (err) {
    log.warn('[open-url] bad url', err)
  }
  showMainWindow()
}

function notify(title: string, body: string): void {
  if (Notification.isSupported()) new Notification({ title, body }).show()
}

app.whenReady().then(async () => {
  ready = true
  log.info(`${APP_DISPLAY_NAME} ${appVersion()} ready · userData=${app.getPath('userData')}`)
  registerIpc()
  housekeeping()
  scheduleAutoCheck()
  nativeTheme.themeSource = getSettings().themeMode
  // 四个共享入口都登记进系统，再按设置决定开哪几个
  void registerBundledShareExtensions()
    .then(() => syncShareEntries())
    .catch((err) => log.warn('[entries] sync failed', err))

  nativeTheme.on('updated', () => broadcast('theme:changed', nativeTheme.shouldUseDarkColors))

  const argvZips = process.argv.slice(1).filter((a) => a.toLowerCase().endsWith('.zip'))
  const files: Array<[string, 'open-with' | 'argv']> = [
    ...pendingFiles.splice(0).map((f): [string, 'open-with'] => [f, 'open-with']),
    ...argvZips.map((f): [string, 'argv'] => [f, 'argv']),
  ]
  const urls = pendingUrls.splice(0)

  if (files.length === 0 && urls.length === 0) showMainWindow('/history')
  for (const [f, source] of files) await handleIncomingFile(f, source)
  for (const u of urls) await handleIncomingUrl(u)

  if (process.env.DIHUA_SNAPSHOT_DIR) {
    const { snapshotTour } = await import('./devSnapshot')
    const main = showMainWindow('/history')
    let confirm: import('electron').BrowserWindow | undefined
    let snapshotJobId: string | undefined
    if (process.env.DIHUA_SNAPSHOT_ZIP) {
      const job = await importZip(process.env.DIHUA_SNAPSHOT_ZIP, 'argv')
      snapshotJobId = job.id
      confirm = showConfirmWindow(job.id)
    }
    await snapshotTour(main, confirm)
    if (snapshotJobId) deleteJob(snapshotJobId, true) // 截图用的记录不留在用户的「记录」里
    // 必须真正退出：开发态实例若残留，会一直占着单实例锁，正式版就再也启动不了
    app.exit(0)
  }

  app.on('activate', () => {
    if (!hasVisibleWindows()) showMainWindow('/history')
  })
})

app.on('window-all-closed', () => {
  // 作为「递一下就走」的工具，窗口全关后退出比常驻更符合预期；Dock 图标点击会重新启动
  app.quit()
})
