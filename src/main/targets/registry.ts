import type { TargetInfo } from '@shared/types'
import { getSettings, updateSettings } from '../store'
import { claudeTarget } from './claude'
import { codexTarget } from './codex'
import { geminiTarget } from './gemini'
import type { Target } from './types'

const targets: Target[] = [codexTarget, claudeTarget, geminiTarget]

export function getTarget(id: string): Target | undefined {
  return targets.find((t) => t.id === id)
}

export function allTargets(): Target[] {
  return targets
}

export async function describeTargets(): Promise<TargetInfo[]> {
  const disabled = new Set(getSettings().disabledTargetIds)
  return Promise.all(
    targets.map(async (t) => {
      const d = await t.detect()
      return {
        id: t.id,
        name: t.name,
        description: t.description,
        capabilities: t.capabilities,
        nextStep: t.nextStep,
        installHint: t.installHint,
        ...d,
        enabled: !disabled.has(t.id),
      }
    }),
  )
}

/** 开关某个目标；把默认目标关掉时，默认切到下一个开着且已安装的 */
export async function setTargetEnabled(id: string, enabled: boolean): Promise<TargetInfo[]> {
  const settings = getSettings()
  const set = new Set(settings.disabledTargetIds)
  if (enabled) set.delete(id)
  else set.add(id)
  const patch: Partial<typeof settings> = { disabledTargetIds: [...set] }
  if (!enabled && settings.defaultTargetId === id) {
    updateSettings(patch)
    const rest = (await describeTargets()).filter((t) => t.enabled && t.available && t.id !== id)
    patch.defaultTargetId = rest[0]?.id ?? settings.defaultTargetId
  }
  updateSettings(patch)
  return describeTargets()
}
