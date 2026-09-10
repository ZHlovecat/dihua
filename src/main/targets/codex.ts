import { app, shell } from 'electron'
import type { Target } from './types'

/**
 * ChatGPT.app（Codex 桌面端）。
 * 深链 codex://threads/new?path=<已存在目录>&prompt=<文字>：
 *   - 桌面端把 path 作为项目打开并新建线程，prompt 预填在输入框，用户回车发送。
 *   - 参数白名单 originUrl / path / prompt（见 docs/调研与技术方案.md §1.2）。
 */
export const codexTarget: Target = {
  id: 'codex',
  name: 'ChatGPT（Codex）',
  description: '在 ChatGPT 桌面端以工作区为项目新建对话，按回车发送。',
  capabilities: { autoSend: false, attachments: 'workspace', promptVia: 'deeplink' },
  nextStep: 'ChatGPT 已打开一个带着这份记录的新对话。切过去，告诉它你要做什么，按回车。',
  shareLabel: '递给 ChatGPT',
  installHint: '未检测到 ChatGPT 桌面端。请安装 ChatGPT for macOS（含 Codex），或在终端执行 codex app。',

  async detect() {
    const appName = app.getApplicationNameForProtocol('codex://')
    if (!appName) return { available: false }
    try {
      const info = await app.getApplicationInfoForProtocol('codex://')
      return {
        available: true,
        appName: info.name || appName,
        appPath: info.path,
        icon: info.icon && !info.icon.isEmpty() ? info.icon.resize({ width: 64, height: 64 }).toDataURL() : undefined,
      }
    } catch {
      return { available: true, appName }
    }
  },

  async deliver({ workspaceRoot, prompt }) {
    const url = new URL('codex://threads/new')
    url.searchParams.set('path', workspaceRoot)
    url.searchParams.set('prompt', prompt)
    await shell.openExternal(url.toString())
  },
}
