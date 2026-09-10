import { createWriteStream, mkdirSync, statSync } from 'node:fs'
import { isUtf8 } from 'node:buffer'
import { dirname, join, normalize, posix, sep } from 'node:path'
import yauzl from 'yauzl'
import iconv from 'iconv-lite'

export interface ExtractedFile {
  /** zip 内相对路径（已解码、已规范化，使用 / 分隔） */
  relPath: string
  absPath: string
  size: number
}

const ZIP_UTF8_FLAG = 0x800

/** 微信 zip 头部标记为 MS-DOS，不一定带 UTF-8 标志；先按标志位，再按 UTF-8 校验，最后回退 GB18030 */
export function decodeEntryName(raw: Buffer, generalPurposeBitFlag: number): string {
  if (generalPurposeBitFlag & ZIP_UTF8_FLAG) return raw.toString('utf8')
  if (isUtf8(raw)) return raw.toString('utf8')
  return iconv.decode(raw, 'gb18030')
}

/** 拒绝绝对路径与目录穿越；忽略 macOS 附带的元数据 */
export function sanitizeRelPath(name: string): string | null {
  const unified = name.replace(/\\/g, '/')
  if (!unified || unified.startsWith('/')) return null
  const norm = posix.normalize(unified)
  if (norm.startsWith('../') || norm === '..' || norm.includes('/../')) return null
  const segs = norm.split('/')
  if (segs[0] === '__MACOSX') return null
  if (segs[segs.length - 1] === '.DS_Store') return null
  return norm
}

export function isZipFile(path: string): boolean {
  try {
    const st = statSync(path)
    if (!st.isFile() || st.size < 22) return false
  } catch {
    return false
  }
  const fd = require('node:fs').openSync(path, 'r')
  try {
    const buf = Buffer.alloc(4)
    require('node:fs').readSync(fd, buf, 0, 4, 0)
    return buf[0] === 0x50 && buf[1] === 0x4b && (buf[2] === 0x03 || buf[2] === 0x05 || buf[2] === 0x07)
  } finally {
    require('node:fs').closeSync(fd)
  }
}

export interface ExtractOptions {
  /** 解压总量上限，默认 4 GB */
  maxTotalBytes?: number
  onProgress?: (done: number, total: number) => void
}

export function extractZip(zipPath: string, destDir: string, opts: ExtractOptions = {}): Promise<ExtractedFile[]> {
  const maxTotal = opts.maxTotalBytes ?? 4 * 1024 * 1024 * 1024
  return new Promise((resolve, reject) => {
    yauzl.open(zipPath, { lazyEntries: true, decodeStrings: false }, (err, zipfile) => {
      if (err || !zipfile) return reject(err ?? new Error('无法打开 zip'))
      const files: ExtractedFile[] = []
      let total = 0
      let done = 0
      const entryCount = zipfile.entryCount

      zipfile.on('error', reject)
      zipfile.on('end', () => resolve(files))
      zipfile.on('entry', (entry: yauzl.Entry) => {
        done += 1
        opts.onProgress?.(done, entryCount)
        const rawName = entry.fileName as unknown as Buffer
        const decoded = decodeEntryName(Buffer.isBuffer(rawName) ? rawName : Buffer.from(String(rawName)), entry.generalPurposeBitFlag)
        const rel = sanitizeRelPath(decoded)
        if (!rel || rel.endsWith('/')) {
          zipfile.readEntry()
          return
        }
        total += entry.uncompressedSize
        if (total > maxTotal) {
          zipfile.close()
          return reject(new Error('压缩包超过大小上限'))
        }
        const abs = join(destDir, ...rel.split('/'))
        // 二次防御：解压后的绝对路径必须仍在 destDir 内
        const normalizedDest = normalize(destDir + sep)
        if (!normalize(abs).startsWith(normalizedDest)) {
          zipfile.readEntry()
          return
        }
        mkdirSync(dirname(abs), { recursive: true })
        zipfile.openReadStream(entry, (streamErr, stream) => {
          if (streamErr || !stream) {
            zipfile.close()
            return reject(streamErr ?? new Error('读取 zip 条目失败'))
          }
          const out = createWriteStream(abs)
          stream.on('error', (e) => {
            zipfile.close()
            reject(e)
          })
          out.on('error', (e) => {
            zipfile.close()
            reject(e)
          })
          out.on('finish', () => {
            files.push({ relPath: rel, absPath: abs, size: entry.uncompressedSize })
            zipfile.readEntry()
          })
          stream.pipe(out)
        })
      })
      zipfile.readEntry()
    })
  })
}
