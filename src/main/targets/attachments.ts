import { existsSync, readdirSync, readFileSync, statSync } from 'node:fs'
import { extname, join } from 'node:path'
import { classifyMedia } from '../parse'

/**
 * 「把文件作为附件上传」的目标（Gemini 等）一次能接多少个文件。
 * Gemini 网页与桌面端的输入框都是 10 个；ChatGPT 走工作区路径，不受此限。
 */
export const INLINE_ATTACHMENT_LIMIT = 10
/** 单个附件超过这个大小就不带（本地上传几百 MB 的视频没有意义） */
export const INLINE_ATTACHMENT_MAX_BYTES = 100 * 1024 * 1024

/** 微信「文件」消息里常见、AI 应用能直接读的文档类型 */
const DOC_EXTS = new Set(['.pdf', '.txt', '.md', '.doc', '.docx', '.rtf', '.csv', '.tsv', '.xls', '.xlsx', '.ppt', '.pptx', '.json', '.html', '.htm'])

export interface AttachmentPlan {
  /** 要交给目标的文件，绝对路径；transcript.md 永远排第一 */
  files: string[]
  images: number
  videos: number
  docs: number
  /** 因数量或大小限制没带上的 */
  omitted: { images: number; videos: number; docs: number }
}

function readMediaNames(inboxDir: string): string[] {
  try {
    const meta = JSON.parse(readFileSync(join(inboxDir, 'meta.json'), 'utf8')) as { mediaFiles?: unknown }
    if (Array.isArray(meta.mediaFiles)) return meta.mediaFiles.filter((x): x is string => typeof x === 'string')
  } catch {
    /* meta.json 缺失或损坏时退回到扫目录 */
  }
  try {
    return readdirSync(join(inboxDir, '媒体')).filter((n) => !n.endsWith('.thumb.png')).sort()
  } catch {
    return []
  }
}

function readDocNames(inboxDir: string): string[] {
  try {
    return readdirSync(join(inboxDir, '文件'))
      .filter((n) => DOC_EXTS.has(extname(n).toLowerCase()))
      .sort()
  } catch {
    return []
  }
}

function sizeOk(p: string): boolean {
  try {
    return statSync(p).size <= INLINE_ATTACHMENT_MAX_BYTES
  } catch {
    return false
  }
}

/**
 * 决定哪些文件作为附件交给目标：transcript.md 先占一个名额，剩下的按 图片 → 文档 → 视频 的顺序填满，
 * 图片最能补充上下文，视频最大最慢所以放最后。超出名额或过大的记入 omitted，提示词里会告诉 AI 没带全。
 */
export function planAttachments(inboxDir: string, limit = INLINE_ATTACHMENT_LIMIT): AttachmentPlan {
  const plan: AttachmentPlan = { files: [], images: 0, videos: 0, docs: 0, omitted: { images: 0, videos: 0, docs: 0 } }
  const transcript = join(inboxDir, 'transcript.md')
  if (existsSync(transcript)) plan.files.push(transcript)

  const media = readMediaNames(inboxDir)
  const groups: Array<{ kind: 'images' | 'docs' | 'videos'; paths: string[] }> = [
    { kind: 'images', paths: media.filter((n) => classifyMedia(n) === 'image').map((n) => join(inboxDir, '媒体', n)) },
    { kind: 'docs', paths: readDocNames(inboxDir).map((n) => join(inboxDir, '文件', n)) },
    { kind: 'videos', paths: media.filter((n) => classifyMedia(n) === 'video').map((n) => join(inboxDir, '媒体', n)) },
  ]
  for (const g of groups) {
    for (const p of g.paths) {
      if (plan.files.length < limit && existsSync(p) && sizeOk(p)) {
        plan.files.push(p)
        plan[g.kind] += 1
      } else {
        plan.omitted[g.kind] += 1
      }
    }
  }
  return plan
}
