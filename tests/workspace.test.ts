import { existsSync, mkdirSync, mkdtempSync, readFileSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'
import { parseTranscript } from '../src/main/parse'
import { buildWorkspace, renderTranscriptMarkdown, safeFolderName } from '../src/main/workspace'
import { buildHandoffPrompt } from '../src/main/handoff'
import type { JobSummary, Settings } from '../src/shared/types'

const TXT = `项目群的聊天记录

2026-09-01 09:12:03 张三
早上好

2026-09-01 09:13:40 李四
[图片] 微信图片_1.jpg

以上为分享的2条聊天记录
`

function settingsIn(root: string): Settings {
  return {
    workspaceRoot: root,
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

describe('buildWorkspace', () => {
  it('生成 inbox 目录、transcript.md、meta.json、AGENTS.md', async () => {
    const root = mkdtempSync(join(tmpdir(), 'dihua-ws-'))
    const work = mkdtempSync(join(tmpdir(), 'dihua-work-'))
    writeFileSync(join(work, '聊天记录.txt'), TXT)
    writeFileSync(join(work, '微信图片_1.jpg'), Buffer.from([0xff, 0xd8]))
    const zip = join(work, '..', 'src.zip')
    writeFileSync(zip, 'PK')

    const transcript = parseTranscript({ text: TXT, mediaFiles: ['微信图片_1.jpg'], fallbackTitle: 'x', txtFileName: '聊天记录.txt' })
    const res = await buildWorkspace({
      jobId: 'job-1',
      createdAt: new Date('2026-09-07T23:10:00'),
      settings: settingsIn(root),
      transcript,
      extracted: [
        { relPath: '聊天记录.txt', absPath: join(work, '聊天记录.txt'), size: 10 },
        { relPath: '微信图片_1.jpg', absPath: join(work, '微信图片_1.jpg'), size: 2 },
      ],
      txtRelPath: '聊天记录.txt',
      sourceZipPath: zip,
      sourceZipName: '聊天记录_x.zip',
    })

    expect(res.inboxRelPath).toBe(join('inbox', '20260907-231000-项目群'))
    expect(existsSync(join(root, 'AGENTS.md'))).toBe(true)
    expect(existsSync(join(res.inboxDir, '原始', '聊天记录.txt'))).toBe(true)
    expect(existsSync(join(res.inboxDir, '原始', '聊天记录_x.zip'))).toBe(true)
    expect(existsSync(join(res.inboxDir, '媒体', '微信图片_1.jpg'))).toBe(true)
    const md = readFileSync(join(res.inboxDir, 'transcript.md'), 'utf8')
    expect(md).toContain('# 项目群')
    expect(md).toContain('## 2026-09-01')
    expect(md).toContain('**张三** 09:12:03')
    expect(md).toContain('![图片](媒体/%E5%BE%AE%E4%BF%A1%E5%9B%BE%E7%89%87_1.jpg)')
    const meta = JSON.parse(readFileSync(join(res.inboxDir, 'meta.json'), 'utf8'))
    expect(meta.counts.messages).toBe(2)
    expect(meta.mediaFiles).toEqual(['微信图片_1.jpg'])
  })

  it('同名目录自动加序号', async () => {
    const root = mkdtempSync(join(tmpdir(), 'dihua-ws-'))
    mkdirSync(join(root, 'inbox', '20260907-231000-项目群'), { recursive: true })
    const transcript = parseTranscript({ text: TXT, mediaFiles: [], fallbackTitle: 'x' })
    const res = await buildWorkspace({
      jobId: 'job-2',
      createdAt: new Date('2026-09-07T23:10:00'),
      settings: { ...settingsIn(root), keepOriginalZip: false },
      transcript,
      extracted: [],
      sourceZipPath: '/nonexistent.zip',
      sourceZipName: 'x.zip',
    })
    expect(res.inboxRelPath).toBe(join('inbox', '20260907-231000-项目群-2'))
  })
})

describe('renderTranscriptMarkdown', () => {
  it('低置信度时嵌入原文', () => {
    const t = parseTranscript({ text: '乱七八糟\n的内容', mediaFiles: [], fallbackTitle: '未知' })
    const md = renderTranscriptMarkdown(t, [])
    expect(md).toContain('```text')
    expect(md).toContain('乱七八糟')
  })
})

describe('safeFolderName / handoff', () => {
  it('去掉文件系统不允许的字符并截断', () => {
    expect(safeFolderName('项目/群:2026?')).toBe('项目 群 2026')
    expect(safeFolderName('')).toBe('聊天记录')
    expect(safeFolderName('a'.repeat(100))).toHaveLength(40)
  })

  it('递交上下文只交代文件位置与概况，结尾留给用户写要求', () => {
    const job: JobSummary = {
      id: 'j',
      createdAt: '',
      source: 'share',
      sourceZipName: 'x.zip',
      workspaceRoot: '/ws',
      inboxDir: '/ws/inbox/a',
      inboxRelPath: 'inbox/a',
      title: '张航、清风明月',
      counts: { messages: 13, images: 1, videos: 0, files: 0, others: 1 },
      timeRange: { start: '2026-09-07 23:53', end: '2026-09-08 01:00' },
      parseConfidence: 'high',
      format: 'block',
      status: 'pending',
    }
    const out = buildHandoffPrompt(job)
    expect(out).toContain('inbox/a/transcript.md')
    expect(out).toContain('张航、清风明月，13 条，2026-09-07 23:53 至 2026-09-08 01:00，含 1 张图片')
    expect(out).toContain('媒体/')
    expect(out.endsWith('按我下面的要求处理：\n')).toBe(true)
  })
})
