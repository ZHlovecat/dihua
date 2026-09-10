import { mkdirSync, mkdtempSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { basename, join } from 'node:path'
import { describe, expect, it } from 'vitest'
import { INLINE_ATTACHMENT_LIMIT, planAttachments } from '../src/main/targets/attachments'
import { buildHandoffPrompt } from '../src/main/handoff'
import type { JobSummary } from '../src/shared/types'

/** 造一个像 buildWorkspace 产出的 inbox 目录 */
function makeInbox(opts: { images?: number; videos?: number; docs?: string[]; meta?: boolean } = {}): string {
  const dir = mkdtempSync(join(tmpdir(), 'dihua-inbox-'))
  writeFileSync(join(dir, 'transcript.md'), '# 群\n')
  mkdirSync(join(dir, '媒体'))
  const mediaFiles: string[] = []
  for (let i = 1; i <= (opts.images ?? 0); i++) {
    const n = `微信图片_${String(i).padStart(2, '0')}.jpg`
    writeFileSync(join(dir, '媒体', n), 'x')
    mediaFiles.push(n)
  }
  for (let i = 1; i <= (opts.videos ?? 0); i++) {
    const n = `微信视频_${i}.mp4`
    writeFileSync(join(dir, '媒体', n), 'x')
    writeFileSync(join(dir, '媒体', `${n}.thumb.png`), 'x')
    mediaFiles.push(n)
  }
  if (opts.docs?.length) {
    mkdirSync(join(dir, '文件'))
    for (const d of opts.docs) writeFileSync(join(dir, '文件', d), 'x')
  }
  if (opts.meta !== false) writeFileSync(join(dir, 'meta.json'), JSON.stringify({ mediaFiles }))
  return dir
}

const job: JobSummary = {
  id: 'j',
  createdAt: '',
  source: 'share',
  sourceZipName: 'x.zip',
  workspaceRoot: '/ws',
  inboxDir: '/ws/inbox/a',
  inboxRelPath: 'inbox/a',
  title: '项目群',
  counts: { messages: 20, images: 12, videos: 1, files: 1, others: 0 },
  timeRange: { start: '2026-09-07 23:53', end: '2026-09-08 01:00' },
  parseConfidence: 'high',
  format: 'block',
  status: 'pending',
}

describe('planAttachments', () => {
  it('transcript.md 排第一，其余按 图片 → 文档 → 视频 填到上限', () => {
    const dir = makeInbox({ images: 12, videos: 1, docs: ['合同.pdf', '备注.txt', '安装包.exe'] })
    const plan = planAttachments(dir)
    expect(plan.files).toHaveLength(INLINE_ATTACHMENT_LIMIT)
    expect(basename(plan.files[0])).toBe('transcript.md')
    expect(plan.files.slice(1).map((f) => basename(f))).toEqual(['微信图片_01.jpg', '微信图片_02.jpg', '微信图片_03.jpg', '微信图片_04.jpg', '微信图片_05.jpg', '微信图片_06.jpg', '微信图片_07.jpg', '微信图片_08.jpg', '微信图片_09.jpg'])
    expect(plan.images).toBe(9)
    expect(plan.docs).toBe(0)
    expect(plan.videos).toBe(0)
    // 3 张图没进去；两个文档都没进去，exe 根本不算文档；视频没进去；缩略图从不算附件
    expect(plan.omitted).toEqual({ images: 3, docs: 2, videos: 1 })
  })

  it('数量够时全带上，视频带的是原文件不是缩略图', () => {
    const dir = makeInbox({ images: 2, videos: 1, docs: ['合同.pdf'] })
    const plan = planAttachments(dir)
    expect(plan.files.map((f) => basename(f))).toEqual(['transcript.md', '微信图片_01.jpg', '微信图片_02.jpg', '合同.pdf', '微信视频_1.mp4'])
    expect(plan.omitted).toEqual({ images: 0, docs: 0, videos: 0 })
  })

  it('没有 meta.json 时扫 媒体/ 目录', () => {
    const dir = makeInbox({ images: 1, meta: false })
    const plan = planAttachments(dir)
    expect(plan.files.map((f) => basename(f))).toEqual(['transcript.md', '微信图片_01.jpg'])
  })

  it('目录不存在时给空计划', () => {
    const plan = planAttachments('/nonexistent/dihua-inbox')
    expect(plan.files).toEqual([])
    expect(plan.omitted).toEqual({ images: 0, docs: 0, videos: 0 })
  })
})

describe('buildHandoffPrompt（附件模式）', () => {
  it('说清附件里有什么、哪些没带全，不再提本地路径', () => {
    const dir = makeInbox({ images: 12, videos: 1, docs: ['合同.pdf'] })
    const out = buildHandoffPrompt(job, planAttachments(dir))
    expect(out).toContain('附件里的 transcript.md（项目群，20 条，2026-09-07 23:53 至 2026-09-08 01:00）')
    expect(out).toContain('附件里还有 9 张图片。')
    expect(out).toContain('另有 3 张图片、1 段视频、1 个文件受附件数量限制没带上')
    expect(out).not.toContain('inbox/a')
    expect(out).not.toContain('媒体/')
    expect(out.endsWith('按我下面的要求处理：\n')).toBe(true)
  })

  it('只有 transcript 时不提附件里还有别的', () => {
    const dir = makeInbox()
    const out = buildHandoffPrompt({ ...job, counts: { messages: 3, images: 0, videos: 0, files: 0, others: 0 } }, planAttachments(dir))
    expect(out).not.toContain('附件里还有')
    expect(out).not.toContain('没带上')
  })
})
