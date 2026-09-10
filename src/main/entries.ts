import { execFile } from 'node:child_process'
import { readdirSync } from 'node:fs'
import { promisify } from 'node:util'
import { app, shell } from 'electron'
import { join } from 'node:path'
import type { ShareEntriesInfo, ShareEntryState } from '@shared/types'
import { getSettings, updateSettings } from './store'
import { allTargets, describeTargets } from './targets/registry'
import log from './log'

const run = promisify(execFile)

/** 通用入口「递话」的 appex id；每个目标应用的入口是 `${SHARE_EXTENSION_ID}.${targetId}`（build-share-extension.sh） */
export const SHARE_EXTENSION_ID = 'app.dihua.desktop.share'
export const targetExtensionId = (targetId: string): string => `${SHARE_EXTENSION_ID}.${targetId}`

/**
 * 某个 appex 在系统共享菜单里开没开。没有公开 API，状态在 pkd 里，
 * 只能问 /usr/bin/pluginkit：`-m -i <id>` 每行一个匹配，首列 `+` 为开，`-`/`!`/空为关，没有行则未登记。
 */
async function pluginState(id: string): Promise<ShareEntryState> {
  if (process.platform !== 'darwin') return 'unregistered'
  try {
    const { stdout } = await run('/usr/bin/pluginkit', ['-m', '-i', id])
    // 行形如 `+    app.dihua.desktop.share(0.0.1)\t…`；带上「(」避免 .share 匹配到 .share.codex
    const line = stdout.split('\n').find((l) => l.includes(`${id}(`))
    if (!line) return 'unregistered'
    return line.trimStart().startsWith('+') ? 'enabled' : 'disabled'
  } catch (err) {
    log.warn('[entries] pluginkit -m failed', err)
    return 'unregistered'
  }
}

async function setPluginEnabled(id: string, enabled: boolean): Promise<void> {
  try {
    await run('/usr/bin/pluginkit', ['-e', enabled ? 'use' : 'ignore', '-i', id])
  } catch (err) {
    log.warn(`[entries] pluginkit -e ${id} failed`, err)
  }
}

/** 打包版首启：把随包的所有 appex 登记进 pkd（开哪几个由 syncShareEntries 决定）。 */
export async function registerBundledShareExtensions(): Promise<void> {
  if (!app.isPackaged || process.platform !== 'darwin') return
  const dir = join(app.getAppPath(), '..', '..', 'PlugIns')
  let names: string[] = []
  try {
    names = readdirSync(dir).filter((n) => n.endsWith('.appex'))
  } catch {
    return
  }
  for (const n of names) {
    try {
      await run('/usr/bin/pluginkit', ['-a', join(dir, n)])
    } catch {
      /* 已登记时会报错，忽略 */
    }
  }
}

interface Plan {
  /** appex id → 该不该开 */
  wanted: Map<string, boolean>
  /** 开着的入口在菜单里显示的名字 */
  names: string[]
  direct: boolean
}

/**
 * 按设置算出每个入口该开该关：
 *   - 「入口」页关掉 → 全关；
 *   - 开了「收到记录后直接递出去」且有可用目标 → 只开各目标的「递给 X」，通用「递话」关掉（点哪个直接递给哪个）；
 *   - 否则只开通用「递话」（弹确认窗）。
 */
async function plan(): Promise<Plan> {
  const settings = getSettings()
  const wanted = new Map<string, boolean>()
  const names: string[] = []
  wanted.set(SHARE_EXTENSION_ID, false)
  for (const t of allTargets()) wanted.set(targetExtensionId(t.id), false)
  if (!settings.autoEnableShareEntry) return { wanted, names, direct: false }

  const targets = await describeTargets()
  const direct = settings.skipConfirm ? targets.filter((t) => t.enabled && t.available) : []
  if (direct.length) {
    for (const t of direct) {
      wanted.set(targetExtensionId(t.id), true)
      names.push(allTargets().find((x) => x.id === t.id)?.shareLabel ?? `递给 ${t.name}`)
    }
    return { wanted, names, direct: true }
  }
  wanted.set(SHARE_EXTENSION_ID, true)
  names.push('递话')
  return { wanted, names, direct: false }
}

async function infoFor(p: Plan): Promise<ShareEntriesInfo> {
  const ids = [...p.wanted.keys()]
  const states = await Promise.all(ids.map(pluginState))
  const registered = states.some((s) => s !== 'unregistered')
  const on = ids.filter((id, i) => p.wanted.get(id) && states[i] === 'enabled')
  const state: ShareEntryState = !registered ? 'unregistered' : on.length ? 'enabled' : 'disabled'
  return { state, direct: p.direct, names: state === 'enabled' ? p.names : [] }
}

/** 把 pkd 里的开关同步成设置要求的样子；设置变了（直接递出去、目标开关、入口开关）都要调一次 */
export async function syncShareEntries(): Promise<ShareEntriesInfo> {
  if (process.platform !== 'darwin') return { state: 'unregistered', direct: false, names: [] }
  const p = await plan()
  for (const [id, on] of p.wanted) {
    const current = await pluginState(id)
    if (current === 'unregistered') continue
    if ((current === 'enabled') !== on) await setPluginEnabled(id, on)
  }
  const info = await infoFor(p)
  log.info(`[entries] share entries ${info.state}${info.names.length ? `：${info.names.join('、')}` : ''}`)
  return info
}

/** 只看不改 */
export async function shareEntriesInfo(): Promise<ShareEntriesInfo> {
  if (process.platform !== 'darwin') return { state: 'unregistered', direct: false, names: [] }
  return infoFor(await plan())
}

export async function shareEntryState(): Promise<ShareEntryState> {
  return (await shareEntriesInfo()).state
}

/** 「入口」页的总开关 */
export async function setShareEntryEnabled(enabled: boolean): Promise<ShareEntryState> {
  updateSettings({ autoEnableShareEntry: enabled })
  return (await syncShareEntries()).state
}

export function openExtensionsSettings(): void {
  // macOS 13–15 都认这个入口；打不开时退到「登录项与扩展」
  void shell.openExternal('x-apple.systempreferences:com.apple.ExtensionsPreferences?Sharing').catch(() => {
    void shell.openExternal('x-apple.systempreferences:com.apple.LoginItems-Settings.extension')
  })
}
