import { execFile } from 'node:child_process'
import { existsSync } from 'node:fs'
import { homedir } from 'node:os'
import { join } from 'node:path'
import { promisify } from 'node:util'
import { clipboard } from 'electron'
import type { Target } from './types'
import log from '../log'

const execFileAsync = promisify(execFile)

/**
 * Gemini 桌面端（/Applications/Gemini.app，com.google.GeminiMacOS）。2026-09-09 对 1.107 / 1.111 的实测：
 *   - Info.plist 没有 CFBundleURLTypes；二进制里的 geminimacos://action/… 只在应用内部用，外部打不开，
 *     也没有 universal link / App Intents / AppleScript 词典，所以没有能预填提示词的深链。
 *   - 文档类型登记了 public.item（所有文件），`open -a Gemini <文件…>` 会把文件作为附件放进当前输入框：
 *     .md 显示为文档、图片显示缩略图；目录会被忽略。
 *   - 应用**冷启动时**随 open 一起送的文件会丢：必须先拉起、等界面就绪，再送文件。
 * 所以投递 = 提示词进剪贴板 + 文件作为附件送进输入框，用户到 Gemini 里 ⌘V 粘贴后回车。
 */
const BUNDLE_ID = 'com.google.GeminiMacOS'
const EXECUTABLE = join('Contents', 'MacOS', 'Gemini')
/** 冷启动后等界面就绪再送文件；实测进程出现后 2 s 已能接住，这里留余量 */
const LAUNCH_SETTLE_MS = 3500
const LAUNCH_TIMEOUT_MS = 15_000

const sleep = (ms: number): Promise<void> => new Promise((r) => setTimeout(r, ms))

async function findApp(): Promise<string | undefined> {
  for (const p of [join('/Applications', 'Gemini.app'), join(homedir(), 'Applications', 'Gemini.app')]) {
    if (existsSync(join(p, EXECUTABLE))) return p
  }
  try {
    const { stdout } = await execFileAsync('mdfind', [`kMDItemCFBundleIdentifier == '${BUNDLE_ID}'`], { timeout: 3000 })
    return stdout
      .split('\n')
      .map((s) => s.trim())
      .find((p) => p.endsWith('.app') && existsSync(join(p, EXECUTABLE)))
  } catch {
    return undefined
  }
}

async function isRunning(appPath: string): Promise<boolean> {
  try {
    await execFileAsync('pgrep', ['-f', join(appPath, EXECUTABLE)])
    return true
  } catch {
    return false
  }
}

async function ensureRunning(appPath: string): Promise<void> {
  if (await isRunning(appPath)) return
  log.info('[gemini] 未运行，先拉起')
  await execFileAsync('open', ['-a', appPath])
  const deadline = Date.now() + LAUNCH_TIMEOUT_MS
  while (!(await isRunning(appPath))) {
    if (Date.now() > deadline) throw new Error('Gemini 启动超时，请手动打开后再递一次')
    await sleep(200)
  }
  await sleep(LAUNCH_SETTLE_MS)
}

export const geminiTarget: Target = {
  id: 'gemini',
  name: 'Gemini',
  description: '把 transcript.md 和图片作为附件放进 Gemini 的输入框，提示词复制到剪贴板；粘贴后按回车发送。',
  capabilities: { autoSend: false, attachments: 'inline', promptVia: 'clipboard' },
  nextStep: '附件已放进 Gemini 的输入框，提示词在剪贴板里。切过去按 ⌘V 粘贴，接着说你的要求，按回车。',
  shareLabel: '递给 Gemini',
  installHint: '未检测到 Gemini 桌面端。请从 gemini.google/mac 安装 Gemini for macOS（需要 macOS 15）。',

  async detect() {
    if (process.platform !== 'darwin') return { available: false }
    const appPath = await findApp()
    if (!appPath) return { available: false }
    // 不取图标：app.getFileIcon(appPath, { size: 'large' }) 会让 Electron 44 主进程在线程池里 CHECK 崩溃
    // （2026-09-09 实测；size 'normal' 只给 32px）；界面上 TargetIcon 用品牌 SVG，不需要系统图标。
    return { available: true, appName: 'Gemini', appPath }
  },

  async deliver({ prompt, attachments }) {
    const appPath = await findApp()
    if (!appPath) throw new Error(this.installHint ?? 'Gemini 未安装')
    // 先放剪贴板：即使后面拉起失败，用户也已经拿到提示词（Electron 44 起 writeText 返回 Promise）
    await clipboard.writeText(prompt)
    await ensureRunning(appPath)
    // open -a 会把文件作为 odoc 事件送给 application:openFiles:，同时把 Gemini 切到前台
    await execFileAsync('open', ['-a', appPath, ...attachments])
    log.info(`[gemini] 送出 ${attachments.length} 个附件，提示词 ${prompt.length} 字已入剪贴板`)
  },
}
