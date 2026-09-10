import { execFileSync } from 'node:child_process'
import { mkdtempSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import iconv from 'iconv-lite'
import { describe, expect, it } from 'vitest'
import { decodeEntryName, extractZip, isZipFile, sanitizeRelPath } from '../src/main/extract'

function makeZip(): { zip: string; dir: string } {
  const dir = mkdtempSync(join(tmpdir(), 'dihua-'))
  const src = join(dir, 'src')
  mkdirSync(join(src, '子目录'), { recursive: true })
  writeFileSync(join(src, '聊天记录.txt'), '2026-09-01 09:12:03 张三\n你好\n', 'utf8')
  writeFileSync(join(src, '微信图片_1.jpg'), Buffer.from([0xff, 0xd8, 0xff, 0xe0, 0, 0]))
  writeFileSync(join(src, '子目录', 'note.txt'), 'x')
  const zip = join(dir, '聊天记录_test.zip')
  execFileSync('/usr/bin/zip', ['-r', '-q', zip, '.'], { cwd: src })
  return { zip, dir }
}

describe('extractZip', () => {
  it('解压 UTF-8 中文文件名并保留目录结构', async () => {
    const { zip, dir } = makeZip()
    expect(isZipFile(zip)).toBe(true)
    const out = join(dir, 'out')
    const files = await extractZip(zip, out)
    const rels = files.map((f) => f.relPath).sort()
    expect(rels).toEqual(['微信图片_1.jpg', '子目录/note.txt', '聊天记录.txt'].sort())
    expect(readFileSync(join(out, '聊天记录.txt'), 'utf8')).toContain('张三')
  })

  it('非 zip 文件被拒绝', () => {
    const dir = mkdtempSync(join(tmpdir(), 'dihua-'))
    const f = join(dir, 'x.zip')
    writeFileSync(f, 'this is not a zip file at all, just text')
    expect(isZipFile(f)).toBe(false)
    expect(isZipFile(join(dir, 'missing.zip'))).toBe(false)
  })
})

describe('decodeEntryName', () => {
  it('带 UTF-8 标志位直接按 UTF-8', () => {
    expect(decodeEntryName(Buffer.from('微信图片_1.jpg', 'utf8'), 0x800)).toBe('微信图片_1.jpg')
  })
  it('无标志位但是合法 UTF-8', () => {
    expect(decodeEntryName(Buffer.from('聊天记录.txt', 'utf8'), 0)).toBe('聊天记录.txt')
  })
  it('无标志位且不是 UTF-8 时回退 GB18030', () => {
    const gbk = iconv.encode('微信视频_20260907.mp4', 'gb18030')
    expect(decodeEntryName(gbk, 0)).toBe('微信视频_20260907.mp4')
  })
})

describe('sanitizeRelPath', () => {
  it('拒绝穿越与绝对路径，忽略 macOS 元数据', () => {
    expect(sanitizeRelPath('../x.txt')).toBeNull()
    expect(sanitizeRelPath('a/../../x.txt')).toBeNull()
    expect(sanitizeRelPath('/etc/passwd')).toBeNull()
    expect(sanitizeRelPath('__MACOSX/._a.jpg')).toBeNull()
    expect(sanitizeRelPath('dir/.DS_Store')).toBeNull()
    expect(sanitizeRelPath('a\\b.txt')).toBe('a/b.txt')
    expect(sanitizeRelPath('聊天记录.txt')).toBe('聊天记录.txt')
  })
})
