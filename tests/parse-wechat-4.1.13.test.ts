import { execFileSync } from 'node:child_process'
import { mkdirSync, mkdtempSync, readFileSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { basename, join } from 'node:path'
import { describe, expect, it } from 'vitest'
import { extractZip } from '../src/main/extract'
import { classifyMedia, locateTranscript, normalizeTime, parseTranscript } from '../src/main/parse'

const FIXTURE = join(__dirname, '..', 'fixtures', 'wechat-4.1.13-聊天记录.txt')
const MEDIA_DIR = '聊天记录内的图片、视频和文件'

describe('微信 Mac 4.1.13「转发到其他应用」真实格式', () => {
  const text = readFileSync(FIXTURE, 'utf8')

  it('识别「·发言人 / 中文日期 / 正文」三段块格式', () => {
    const t = parseTranscript({
      text,
      mediaFiles: ['微信图片_202609080100_1.jpg', '微信视频_202609080102_1.mp4'],
      fallbackTitle: '20260908_011145',
      txtFileName: '聊天记录.txt',
    })
    expect(t.format).toBe('block')
    expect(t.parseConfidence).toBe('high')
    expect(t.messages).toHaveLength(11)
    expect(t.title).toBe('张三、李四')
    expect(t.messages[0]).toMatchObject({ sender: '张三', time: '2026-09-07 23:53', kind: 'text', text: '等会三点还有个会' })
    expect(t.messages[2].text).toBe('这周天天开会\n第二行还在说')
    expect(t.messages[5]).toMatchObject({ kind: 'sticker' })
    expect(t.messages[6]).toMatchObject({ kind: 'text', text: '[亲亲][亲亲][亲亲]' })
    expect(t.messages[7]).toMatchObject({ kind: 'image', mediaFile: '微信图片_202609080100_1.jpg' })
    expect(t.messages[8]).toMatchObject({ kind: 'video', mediaFile: '微信视频_202609080102_1.mp4' })
    expect(t.messages[9]).toMatchObject({ kind: 'file' })
    expect(t.counts).toEqual({ messages: 11, images: 1, videos: 1, files: 1, others: 1 })
    expect(t.timeRange).toEqual({ start: '2026-09-07 23:53', end: '2026-09-08 01:04' })
  })

  it('中文日期规范化', () => {
    expect(normalizeTime('2026年9月7日 23:53')).toBe('2026-09-07 23:53')
    expect(normalizeTime('2026年12月31日 8:05:09')).toBe('2026-12-31 08:05:09')
    expect(normalizeTime('2026年9月7日')).toBe('2026-09-07')
  })

  it('发言人名字里有冒号或以「·」开头也不影响', () => {
    const t = parseTranscript({
      text: '·A·B：老板\n2026年9月8日 01:00\n你好\n\n·王五\n2026年9月8日 01:01\n[图片]\n',
      mediaFiles: [],
      fallbackTitle: 'x',
    })
    expect(t.messages).toHaveLength(2)
    expect(t.messages[0].sender).toBe('A·B：老板')
    expect(t.messages[1]).toMatchObject({ kind: 'image', mediaFile: undefined })
  })

  it('真实 zip 布局：媒体在子目录里，条目名是 UTF-8', async () => {
    const dir = mkdtempSync(join(tmpdir(), 'dihua-real-'))
    const src = join(dir, 'src')
    mkdirSync(join(src, MEDIA_DIR), { recursive: true })
    writeFileSync(join(src, '聊天记录.txt'), text)
    writeFileSync(join(src, MEDIA_DIR, '微信图片_202609080100_1.jpg'), Buffer.from([0xff, 0xd8, 0xff]))
    const zip = join(dir, '聊天记录_20260908_011145.zip')
    execFileSync('/usr/bin/zip', ['-r', '-q', zip, '.'], { cwd: src })

    const files = await extractZip(zip, join(dir, 'out'))
    const rels = files.map((f) => f.relPath)
    expect(locateTranscript(rels)).toBe('聊天记录.txt')
    const media = rels.map((r) => basename(r)).filter((n) => classifyMedia(n) !== 'other')
    expect(media).toEqual(['微信图片_202609080100_1.jpg'])
    expect(rels).toContain(`${MEDIA_DIR}/微信图片_202609080100_1.jpg`)
  })
})
