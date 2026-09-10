import type { JobSummary } from '@shared/types'
import type { AttachmentPlan } from './targets/attachments'

/**
 * 递给 AI 时预填的上下文。只交代「东西在哪、是什么」，不替用户下任务——
 * 用户到了目标应用里自己说要做什么。结尾留一个冒号和换行，光标落在下一行。
 *
 * 不传 plan：目标能读本地目录（ChatGPT/Codex），告诉它工作区里的相对路径。
 * 传 plan：目标只认附件（Gemini），告诉它附件里有什么、哪些没带全。
 */
export function buildHandoffPrompt(job: JobSummary, plan?: AttachmentPlan): string {
  const facts: string[] = [job.title, `${job.counts.messages} 条`]
  if (job.timeRange) facts.push(`${job.timeRange.start} 至 ${job.timeRange.end}`)

  let out: string
  if (plan) {
    out = `我从微信递来一份聊天记录，就是附件里的 transcript.md（${facts.join('，')}）。`
    const attached = describe(plan.images, plan.videos, plan.docs)
    if (attached) out += `附件里还有${attached}。`
    const omitted = describe(plan.omitted.images, plan.omitted.videos, plan.omitted.docs)
    if (omitted) out += `另有${omitted}受附件数量限制没带上，需要的话我再补。`
  } else {
    const rel = `${job.inboxRelPath.replace(/\\/g, '/')}/transcript.md`
    const media = describe(job.counts.images, job.counts.videos, job.counts.files)
    if (media) facts.push(`含${media}`)
    out = `我从微信递来一份聊天记录：${rel}（${facts.join('，')}）。`
    if (job.counts.images) out += '图片在同目录 媒体/ 下，可以直接查看。'
    if (job.counts.videos) out += '视频看同名的 .thumb.png 缩略图。'
  }
  if (job.parseConfidence === 'low') out += '这份记录没能按条解析，transcript.md 里是微信原文。'
  out += '请先通读它，然后按我下面的要求处理：\n'
  return out
}

/** 「3 张图片、1 段视频、2 个文件」；全为 0 时返回空串 */
function describe(images: number, videos: number, files: number): string {
  const parts: string[] = []
  if (images) parts.push(`${images} 张图片`)
  if (videos) parts.push(`${videos} 段视频`)
  if (files) parts.push(`${files} 个文件`)
  return parts.length ? ` ${parts.join('、')}` : ''
}
