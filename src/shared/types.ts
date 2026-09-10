export type MessageKind =
  | 'text'
  | 'image'
  | 'video'
  | 'file'
  | 'sticker'
  | 'nested'
  | 'voice'
  | 'call'
  | 'other'

export interface ChatMessage {
  index: number
  /** 规范化后的时间，如 2026-09-07 23:53 */
  time?: string
  sender?: string
  kind: MessageKind
  text: string
  /** 媒体/ 下的文件名（占位符成功关联到真实文件时） */
  mediaFile?: string
  raw: string
}

export type ParseConfidence = 'high' | 'medium' | 'low'
/** block = 微信 Mac 4.1.13 实际导出：「·发言人」一行 + 中文日期一行 + 正文 */
export type LineFormat = 'block' | 'time-first' | 'name-first' | 'unknown'

export interface TranscriptCounts {
  messages: number
  images: number
  videos: number
  files: number
  others: number
}

export interface Transcript {
  title: string
  messages: ChatMessage[]
  parseConfidence: ParseConfidence
  format: LineFormat
  timeRange?: { start: string; end: string }
  counts: TranscriptCounts
  /** 微信 TXT 原文 */
  rawText: string
  txtFileName?: string
  /** 尾行声明的条数（若有） */
  declaredCount?: number
}

export type JobStatus = 'pending' | 'delivered' | 'cancelled' | 'failed'

export interface JobSummary {
  id: string
  createdAt: string
  source: 'share' | 'open-with' | 'argv' | 'drag' | 'url'
  sourceZipName: string
  workspaceRoot: string
  inboxDir: string
  inboxRelPath: string
  title: string
  counts: TranscriptCounts
  timeRange?: { start: string; end: string }
  parseConfidence: ParseConfidence
  format: LineFormat
  status: JobStatus
  deliveredTo?: string
  deliveredAt?: string
  lastPrompt?: string
  error?: string
}

export interface JobDetail extends JobSummary {
  preview: ChatMessage[]
  mediaFiles: string[]
  /** 递过去时预填的上下文 */
  handoffPrompt: string
}

export interface TargetCapabilities {
  autoSend: boolean
  /** workspace：目标能读本地目录，只递路径；inline：把 transcript.md 与媒体作为附件交给目标 */
  attachments: 'workspace' | 'inline' | 'none'
  /** 提示词怎么到目标那里：deeplink 直接预填在输入框；clipboard 复制到剪贴板，用户粘贴 */
  promptVia: 'deeplink' | 'clipboard'
}

export interface TargetInfo {
  id: string
  name: string
  description: string
  available: boolean
  appName?: string
  appPath?: string
  /** data URL */
  icon?: string
  capabilities: TargetCapabilities
  /** 未安装时的引导 */
  installHint?: string
  /** 用户在「目标应用」里开没开这个目标；关掉的不会出现在确认窗里 */
  enabled: boolean
  /** 递出去之后用户还要做什么（成功页与系统通知都用它） */
  nextStep: string
}

export type Language = 'zh-CN' | 'zh-TW' | 'en'
export type ThemeMode = 'system' | 'light' | 'dark'

export interface Settings {
  workspaceRoot: string
  defaultTargetId: string
  skipConfirm: boolean
  keepOriginalZip: boolean
  retentionDays: number
  language: Language
  /** 启动时自动把共享菜单入口打开；用户在「入口」里关掉后置 false */
  autoEnableShareEntry: boolean
  /** 被用户停用的目标应用 id */
  disabledTargetIds: string[]
  /** 外观：跟随系统 / 白天 / 黑夜 */
  themeMode: ThemeMode
  /** 打包版启动后每天最多查一次 GitHub Releases，有新版本弹通知 */
  autoCheckUpdates: boolean
  /** 用户点过「跳过这个版本」的版本号，不再为它弹通知 */
  skippedUpdateVersion?: string
}

export interface DeliverOptions {
  targetId: string
  rememberSkipConfirm?: boolean
}

export type DeliverResult =
  | { ok: true; prompt: string; targetName: string; nextStep: string }
  | { ok: false; error: string }

export interface AppInfo {
  version: string
  userDataDir: string
  logFile: string
  platform: string
  isPackaged: boolean
}

export type ShareEntryState = 'enabled' | 'disabled' | 'unregistered'

export interface ShareEntriesInfo {
  state: ShareEntryState
  /** true = 开了「收到记录后直接递出去」，共享菜单里按目标应用分开列出「递给 X」 */
  direct: boolean
  /** 当前开着的入口在菜单里显示的名字 */
  names: string[]
}

export interface HistoryStats {
  count: number
  bytes: number
}

/** 一次更新检查的结果（也是 userData/update.json 里缓存的内容） */
export interface UpdateInfo {
  current: string
  /** GitHub 上最新正式版；仓库还没发布过时为空 */
  latest?: string
  hasUpdate: boolean
  /** 本机架构的 dmg 优先，其次任意 dmg / zip */
  downloadUrl?: string
  releaseUrl?: string
  publishedAt?: string
  /** Release 说明（Markdown 原文） */
  notes?: string
  checkedAt: string
  error?: string
}
