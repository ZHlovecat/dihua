import { describe, expect, it } from 'vitest'
import { classifyMedia, locateTranscript, parseTranscript } from '../src/main/parse'

const TIME_FIRST = `项目群的聊天记录

2026-09-01 09:12:03 张三
早上好，今天的评审改到下午三点

2026-09-01 09:13:40 李四
[图片] 微信图片_20260901091340.jpg

2026-09-01 09:15:00 李四
收到，我把会议室改一下
顺便把 PRD 发一下

2026-09-02 18:30:11 王五
[视频] 微信视频_20260902183011.mp4

2026-09-02 18:31:00 王五
[动画表情]

以上为分享的5条聊天记录
`

const NAME_FIRST = `张三 2026/9/1 9:12
早上好
李四 2026/9/1 9:13
[图片] 微信图片_1.jpg
王五 2026/9/1 9:14
今天开会
`

describe('parseTranscript', () => {
  it('识别「时间在前」格式并关联媒体', () => {
    const t = parseTranscript({
      text: TIME_FIRST,
      mediaFiles: ['微信图片_20260901091340.jpg', '微信视频_20260902183011.mp4'],
      fallbackTitle: 'x',
      txtFileName: '聊天记录.txt',
    })
    expect(t.format).toBe('time-first')
    expect(t.title).toBe('项目群')
    expect(t.messages).toHaveLength(5)
    expect(t.declaredCount).toBe(5)
    expect(t.parseConfidence).toBe('high')
    expect(t.messages[0]).toMatchObject({ time: '2026-09-01 09:12:03', sender: '张三', kind: 'text' })
    expect(t.messages[1]).toMatchObject({ kind: 'image', mediaFile: '微信图片_20260901091340.jpg' })
    expect(t.messages[2].text).toBe('收到，我把会议室改一下\n顺便把 PRD 发一下')
    expect(t.messages[3]).toMatchObject({ kind: 'video', mediaFile: '微信视频_20260902183011.mp4' })
    expect(t.messages[4].kind).toBe('sticker')
    expect(t.counts).toEqual({ messages: 5, images: 1, videos: 1, files: 0, others: 1 })
    expect(t.timeRange).toEqual({ start: '2026-09-01 09:12:03', end: '2026-09-02 18:31:00' })
  })

  it('识别「人名在前」格式并规范化日期', () => {
    const t = parseTranscript({ text: NAME_FIRST, mediaFiles: ['微信图片_1.jpg'], fallbackTitle: '备用' })
    expect(t.format).toBe('name-first')
    expect(t.title).toBe('张三、李四、王五') // 没有标题行时用参与者拼标题
    expect(t.messages).toHaveLength(3)
    expect(t.messages[0]).toMatchObject({ time: '2026-09-01 09:12', sender: '张三' })
    expect(t.messages[1]).toMatchObject({ kind: 'image', mediaFile: '微信图片_1.jpg' })
  })

  it('声明条数与实际不符时降为 medium', () => {
    const t = parseTranscript({ text: TIME_FIRST.replace('5条', '9条'), mediaFiles: [], fallbackTitle: 'x' })
    expect(t.parseConfidence).toBe('medium')
  })

  it('完全不认识的格式：置信度 low，保留原文', () => {
    const t = parseTranscript({ text: '随便写点什么\n没有时间也没有人名\n', mediaFiles: [], fallbackTitle: '一批文件' })
    expect(t.format).toBe('unknown')
    expect(t.parseConfidence).toBe('low')
    expect(t.rawText).toContain('随便写点什么')
  })

  it('空文本', () => {
    const t = parseTranscript({ text: '', mediaFiles: [], fallbackTitle: '一批文件' })
    expect(t.messages).toHaveLength(0)
    expect(t.parseConfidence).toBe('low')
    expect(t.title).toBe('一批文件')
  })
})

describe('locateTranscript / classifyMedia', () => {
  it('优先按语言候选名，其次唯一 txt，再次最大 txt', () => {
    expect(locateTranscript(['a/微信图片_1.jpg', '聊天记录.txt'])).toBe('聊天记录.txt')
    expect(locateTranscript(['Chat History.txt', 'x.jpg'])).toBe('Chat History.txt')
    expect(locateTranscript(['notes.txt', 'x.jpg'])).toBe('notes.txt')
    const sizes = new Map([
      ['a.txt', 10],
      ['b.txt', 500],
    ])
    expect(locateTranscript(['a.txt', 'b.txt'], sizes)).toBe('b.txt')
    expect(locateTranscript(['x.jpg'])).toBeUndefined()
  })

  it('按扩展名分类媒体', () => {
    expect(classifyMedia('微信图片_1.JPG')).toBe('image')
    expect(classifyMedia('微信视频_1.mp4')).toBe('video')
    expect(classifyMedia('合同.pdf')).toBe('other')
  })
})
