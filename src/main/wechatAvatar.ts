import { existsSync, readdirSync, statSync } from 'node:fs'
import { join } from 'node:path'
import { app, nativeImage } from 'electron'
import log from './log'

/**
 * 微信 Mac 4.x 会把登录页用的账号头像缓存在
 *   ~/Library/Containers/com.tencent.xinWeChat/Data/Documents/xwechat_files/all_users/head_imgs/<uin>/<时间戳>
 * 未加密的 JPEG。取最新的一张当作「我的微信头像」；联系人头像在加密库里，不碰。
 */
const HEAD_IMGS = join(
  app.getPath('home'),
  'Library/Containers/com.tencent.xinWeChat/Data/Documents/xwechat_files/all_users/head_imgs',
)

let cache: { path: string; mtimeMs: number; dataUrl: string } | undefined

function newestFile(): { path: string; mtimeMs: number } | undefined {
  if (!existsSync(HEAD_IMGS)) return undefined
  let best: { path: string; mtimeMs: number } | undefined
  for (const dir of readdirSync(HEAD_IMGS, { withFileTypes: true })) {
    if (!dir.isDirectory()) continue
    const sub = join(HEAD_IMGS, dir.name)
    for (const f of readdirSync(sub, { withFileTypes: true })) {
      if (!f.isFile()) continue
      const p = join(sub, f.name)
      const st = statSync(p)
      if (st.size < 512) continue
      if (!best || st.mtimeMs > best.mtimeMs) best = { path: p, mtimeMs: st.mtimeMs }
    }
  }
  return best
}

/** 返回 128px 的 data URL；找不到或读不了时返回 undefined，界面退回首字头像 */
export function ownWeChatAvatar(): string | undefined {
  // 截图模式不读真实头像，界面退回递话图标
  if (process.env.DIHUA_SNAPSHOT_DIR) return undefined
  try {
    const file = newestFile()
    if (!file) return undefined
    if (cache && cache.path === file.path && cache.mtimeMs === file.mtimeMs) return cache.dataUrl
    const img = nativeImage.createFromPath(file.path)
    if (img.isEmpty()) return undefined
    const dataUrl = img.resize({ width: 128, height: 128, quality: 'good' }).toDataURL()
    cache = { ...file, dataUrl }
    return dataUrl
  } catch (err) {
    log.warn('[avatar] read WeChat avatar failed', err)
    return undefined
  }
}
