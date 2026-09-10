import { app, net, Notification, shell } from 'electron'
import type { UpdateInfo } from '@shared/types'
import { GITHUB_REPO, RELEASES_URL } from '@shared/repo'
import { appVersion } from './paths'
import { getSettings, readUpdateCache, writeUpdateCache } from './store'
import { describeRelease, type GitHubRelease } from './updateCheck'
import { broadcast } from './windows'
import log from './log'

/**
 * 检查更新：读 GitHub Releases 的 latest（不含预发布与草稿），和当前版本比。
 * 递话是 ad-hoc 签名的开源应用，Squirrel 不接受未经 Developer ID 签名的自动替换，
 * 所以这里只「告诉用户有新版本 + 给下载链接」，不做后台静默更新。
 */
const API = `https://api.github.com/repos/${GITHUB_REPO}/releases/latest`
const TIMEOUT_MS = 10_000
/** 自动检查：启动后稍等一会儿，且距上次检查超过一天 */
const AUTO_CHECK_DELAY_MS = 15_000
const AUTO_CHECK_INTERVAL_MS = 24 * 60 * 60 * 1000

export async function checkForUpdates(): Promise<UpdateInfo> {
  const current = appVersion()
  const checkedAt = new Date().toISOString()
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS)
  let info: UpdateInfo
  try {
    const res = await net.fetch(API, {
      headers: { Accept: 'application/vnd.github+json', 'User-Agent': `dihua/${current}` },
      signal: controller.signal,
    })
    if (res.status === 404) {
      // 仓库还没有任何正式发布
      info = { current, hasUpdate: false, checkedAt, releaseUrl: RELEASES_URL }
    } else if (!res.ok) {
      throw new Error(`GitHub 返回 ${res.status}`)
    } else {
      info = describeRelease((await res.json()) as GitHubRelease, current, process.arch, checkedAt)
    }
  } catch (err) {
    const aborted = err instanceof Error && err.name === 'AbortError'
    info = { current, hasUpdate: false, checkedAt, releaseUrl: RELEASES_URL, error: aborted ? '连接 GitHub 超时' : err instanceof Error ? err.message : String(err) }
    log.warn('[update] check failed', err)
  } finally {
    clearTimeout(timer)
  }
  writeUpdateCache(info)
  broadcast('update:changed', info)
  log.info(`[update] current ${info.current}, latest ${info.latest ?? '-'}, hasUpdate=${info.hasUpdate}${info.error ? `, error=${info.error}` : ''}`)
  return info
}

/** 打包版启动后自动检查一次（每天最多一次）；有新版本且没被「跳过」就弹系统通知 */
export function scheduleAutoCheck(): void {
  if (!app.isPackaged) return
  setTimeout(() => {
    void (async () => {
      const settings = getSettings()
      if (!settings.autoCheckUpdates) return
      const cache = readUpdateCache()
      if (cache && Date.now() - Date.parse(cache.checkedAt) < AUTO_CHECK_INTERVAL_MS) return
      const info = await checkForUpdates()
      if (!info.hasUpdate || !info.latest || info.latest === settings.skippedUpdateVersion || !Notification.isSupported()) return
      const n = new Notification({ title: `递话有新版本 ${info.latest}`, body: '点击打开下载页；也可以在「关于」里查看更新说明。' })
      const url = info.downloadUrl ?? info.releaseUrl ?? RELEASES_URL
      n.on('click', () => void shell.openExternal(url))
      n.show()
    })()
  }, AUTO_CHECK_DELAY_MS)
}
