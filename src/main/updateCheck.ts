import type { UpdateInfo } from '@shared/types'
import { RELEASES_URL } from '@shared/repo'

/** GitHub Releases API 里我们用到的字段 */
export interface GitHubRelease {
  tag_name?: string
  name?: string
  html_url?: string
  body?: string
  published_at?: string
  draft?: boolean
  prerelease?: boolean
  assets?: Array<{ name?: string; browser_download_url?: string }>
}

/** 去掉前导 v，按点分段比较；预发布后缀（1.2.0-beta.1）低于同号正式版。返回 <0 / 0 / >0 */
export function compareVersions(a: string, b: string): number {
  const parse = (v: string): { nums: number[]; pre: string } => {
    const m = /^v?(\d+(?:\.\d+)*)(?:-([0-9A-Za-z.-]+))?/.exec(v.trim())
    if (!m) return { nums: [0], pre: '' }
    return { nums: m[1].split('.').map((n) => Number(n)), pre: m[2] ?? '' }
  }
  const x = parse(a)
  const y = parse(b)
  const len = Math.max(x.nums.length, y.nums.length)
  for (let i = 0; i < len; i++) {
    const d = (x.nums[i] ?? 0) - (y.nums[i] ?? 0)
    if (d !== 0) return d
  }
  if (x.pre === y.pre) return 0
  if (!x.pre) return 1
  if (!y.pre) return -1
  return x.pre < y.pre ? -1 : 1
}

/** 选下载链接：本机架构的 dmg 优先，其次任意 dmg，再其次 zip；都没有就 undefined */
export function pickAsset(assets: GitHubRelease['assets'], arch: string): string | undefined {
  const list = (assets ?? []).filter((a) => a.name && a.browser_download_url)
  const tag = arch === 'arm64' ? 'arm64' : 'x64'
  const by = (pred: (name: string) => boolean): string | undefined => list.find((a) => pred(a.name!.toLowerCase()))?.browser_download_url
  return (
    by((n) => n.endsWith('.dmg') && n.includes(tag)) ??
    by((n) => n.endsWith('.dmg')) ??
    by((n) => n.endsWith('.zip') && n.includes(tag)) ??
    by((n) => n.endsWith('.zip'))
  )
}

/** 把 /releases/latest 的返回整理成界面要的样子 */
export function describeRelease(release: GitHubRelease, current: string, arch: string, checkedAt: string): UpdateInfo {
  const latest = (release.tag_name ?? release.name ?? '').replace(/^v/, '')
  if (!latest) return { current, hasUpdate: false, checkedAt, releaseUrl: RELEASES_URL }
  return {
    current,
    latest,
    hasUpdate: compareVersions(latest, current) > 0,
    downloadUrl: pickAsset(release.assets, arch),
    releaseUrl: release.html_url ?? RELEASES_URL,
    publishedAt: release.published_at,
    notes: release.body?.trim() || undefined,
    checkedAt,
  }
}
