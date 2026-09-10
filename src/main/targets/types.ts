import type { JobSummary, TargetCapabilities, TargetInfo } from '@shared/types'

export interface DeliveryJob {
  job: JobSummary
  /** 工作区根目录（绝对路径，已存在） */
  workspaceRoot: string
  /** 这份记录自己的 inbox 目录（绝对路径，已存在） */
  inboxDir: string
  /** 本次要发送的提示词 */
  prompt: string
  /** capabilities.attachments 为 inline 时，要一并交给目标的文件（绝对路径，transcript.md 在最前） */
  attachments: string[]
}

export interface Target {
  id: string
  name: string
  description: string
  capabilities: TargetCapabilities
  /** 递出去之后用户还要做什么，一两句话 */
  nextStep: string
  /** 系统共享菜单里「递给 X」入口的名字；必须和 build-share-extension.sh 里该目标 appex 的显示名一致 */
  shareLabel: string
  installHint?: string
  detect(): Promise<Omit<TargetInfo, 'id' | 'name' | 'description' | 'capabilities' | 'installHint' | 'enabled' | 'nextStep'>>
  deliver(job: DeliveryJob): Promise<void>
}
