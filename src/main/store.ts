import { existsSync, mkdirSync, readFileSync, renameSync, writeFileSync } from 'node:fs'
import { dirname } from 'node:path'
import type { JobSummary, Settings, UpdateInfo } from '@shared/types'
import { defaultWorkspaceRoot, historyFile, settingsFile, updateFile } from './paths'
import log from './log'

class JsonFile<T> {
  constructor(
    private readonly file: () => string,
    private readonly fallback: () => T,
  ) {}

  read(): T {
    const f = this.file()
    if (!existsSync(f)) return this.fallback()
    try {
      return JSON.parse(readFileSync(f, 'utf8')) as T
    } catch (err) {
      log.warn(`读取 ${f} 失败，使用默认值`, err)
      return this.fallback()
    }
  }

  write(value: T): void {
    const f = this.file()
    mkdirSync(dirname(f), { recursive: true })
    const tmp = `${f}.tmp`
    writeFileSync(tmp, JSON.stringify(value, null, 2), 'utf8')
    renameSync(tmp, f)
  }
}

const settingsJson = new JsonFile<Partial<Settings>>(settingsFile, () => ({}))
const historyJson = new JsonFile<JobSummary[]>(historyFile, () => [])
const updateJson = new JsonFile<UpdateInfo | null>(updateFile, () => null)

export function defaultSettings(): Settings {
  return {
    workspaceRoot: defaultWorkspaceRoot(),
    defaultTargetId: 'codex',
    skipConfirm: false,
    keepOriginalZip: true,
    retentionDays: 0,
    language: 'zh-CN',
    autoEnableShareEntry: true,
    disabledTargetIds: [],
    themeMode: 'system',
    autoCheckUpdates: true,
  }
}

export function getSettings(): Settings {
  const merged = { ...defaultSettings(), ...settingsJson.read() }
  // 开发/截图用：避免开发态进程去碰 ~/Documents 触发系统授权弹窗
  if (process.env.DIHUA_WORKSPACE_ROOT) merged.workspaceRoot = process.env.DIHUA_WORKSPACE_ROOT
  return merged
}

export function updateSettings(patch: Partial<Settings>): Settings {
  const stored = settingsJson.read()
  settingsJson.write({ ...stored, ...patch })
  return getSettings()
}

export function listHistory(): JobSummary[] {
  return historyJson.read().sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1))
}

export function getJob(id: string): JobSummary | undefined {
  return historyJson.read().find((j) => j.id === id)
}

export function upsertJob(job: JobSummary): void {
  const all = historyJson.read()
  const idx = all.findIndex((j) => j.id === job.id)
  if (idx >= 0) all[idx] = job
  else all.push(job)
  historyJson.write(all)
}

export function removeJob(id: string): void {
  historyJson.write(historyJson.read().filter((j) => j.id !== id))
}

export function replaceHistory(jobs: JobSummary[]): void {
  historyJson.write(jobs)
}

export function readUpdateCache(): UpdateInfo | null {
  return updateJson.read()
}

export function writeUpdateCache(info: UpdateInfo): void {
  updateJson.write(info)
}
