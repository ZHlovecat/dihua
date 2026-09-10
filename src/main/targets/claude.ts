import { execFile } from 'node:child_process'
import { existsSync } from 'node:fs'
import { join } from 'node:path'
import { promisify } from 'node:util'
import { app, shell } from 'electron'
import type { Target } from './types'
import log from '../log'

const execFileAsync = promisify(execFile)

/**
 * Claude 桌面端（/Applications/Claude.app，com.anthropic.claudefordesktop）。2026-09-09 对 1.28929 / 1.46388 的源码分析 + 实测：
 *   - 登记了 claude:// scheme，主进程 claudeURLHandler 按 host 路由：
 *       claude://cowork/new?q=<文字>[&folder=<目录>]  Cowork 新任务，q 预填在输入框（截到 14336 字符）
 *       claude://claude.ai/new?q=<文字>              普通对话，只预填文字
 *       claude://code/new?q=<文字>&folder=<目录>      Claude Code 会话
 *   - 深链里直接带 folder 会弹「Another app wants Claude to work in …」授权框，用户点允许后页面重载，q 就没了。
 *   - 但文档类型登记了 public.folder（Editor）：`open -a Claude <目录>` 走「拖目录到 Dock」的路径
 *     （dispatchOnCoworkFromMain），目录直接挂到 Cowork 的草稿任务上，已信任的目录不弹框；草稿目录在主进程里，
 *     随后再发只带 q 的深链，输入框里出现提示词，目录 chip 还在。
 * 所以投递分两步：先 open 目录，再发 q。目录是整个工作区，提示词沿用「工作区」措辞。
 */
const APP_PATH = '/Applications/Claude.app'
const EXECUTABLE = join('Contents', 'MacOS', 'Claude')
/** 冷启动：进程出现后再等主视图把 claude.ai 载入，实测 5 s 左右 */
const LAUNCH_SETTLE_MS = 6000
const LAUNCH_TIMEOUT_MS = 20_000
/** 目录挂上（主进程日志里是同一秒完成）到发 q 之间留的间隔 */
const FOLDER_SETTLE_MS = 2000

const sleep = (ms: number): Promise<void> => new Promise((r) => setTimeout(r, ms))

async function findApp(): Promise<string | undefined> {
  if (process.platform !== 'darwin') return undefined
  if (app.getApplicationNameForProtocol('claude://')) {
    try {
      const info = await app.getApplicationInfoForProtocol('claude://')
      // claude:// 被别的应用抢注（比如某个 CLI 的 URL handler）时不算
      if (/claude\.app$/i.test(info.path) && existsSync(join(info.path, EXECUTABLE))) return info.path
    } catch {
      /* 继续按固定路径找 */
    }
  }
  return existsSync(join(APP_PATH, EXECUTABLE)) ? APP_PATH : undefined
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
  log.info('[claude] 未运行，先拉起')
  await execFileAsync('open', ['-a', appPath])
  const deadline = Date.now() + LAUNCH_TIMEOUT_MS
  while (!(await isRunning(appPath))) {
    if (Date.now() > deadline) throw new Error('Claude 启动超时，请手动打开后再递一次')
    await sleep(200)
  }
  await sleep(LAUNCH_SETTLE_MS)
}

export const claudeTarget: Target = {
  id: 'claude',
  name: 'Claude',
  description: '在 Claude 桌面端的 Cowork 里新建任务：工作区目录挂上、提示词填好，按回车发送。',
  capabilities: { autoSend: false, attachments: 'workspace', promptVia: 'deeplink' },
  nextStep: 'Claude 已打开一个挂着工作区目录的 Cowork 新任务，提示词在输入框里。切过去，接着说你要做什么，按回车。',
  shareLabel: '递给 Claude',
  installHint: '未检测到 Claude 桌面端。请从 claude.ai/download 安装 Claude for Mac 并登录。',

  async detect() {
    const appPath = await findApp()
    if (!appPath) return { available: false }
    return { available: true, appName: 'Claude', appPath }
  },

  async deliver({ workspaceRoot, prompt }) {
    const appPath = await findApp()
    if (!appPath) throw new Error(this.installHint ?? 'Claude 未安装')
    await ensureRunning(appPath)
    // 第一步：把工作区目录交给 Claude（走 open-file，不是深链），挂到 Cowork 草稿任务上
    await execFileAsync('open', ['-a', appPath, workspaceRoot])
    await sleep(FOLDER_SETTLE_MS)
    // 第二步：只带 q 的深链，输入框里出现提示词，目录 chip 还在
    const url = new URL('claude://cowork/new')
    url.searchParams.set('q', prompt)
    await shell.openExternal(url.toString())
    log.info(`[claude] 目录 ${workspaceRoot} 已交给 Cowork，提示词 ${prompt.length} 字已送出`)
  },
}
