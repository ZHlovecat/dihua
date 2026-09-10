import { describe, expect, it } from 'vitest'
import { compareVersions, describeRelease, pickAsset } from '../src/main/updateCheck'

describe('compareVersions', () => {
  it('按数字逐段比较，忽略前导 v', () => {
    expect(compareVersions('v0.0.2', '0.0.1')).toBeGreaterThan(0)
    expect(compareVersions('0.10.0', '0.9.9')).toBeGreaterThan(0)
    expect(compareVersions('1.0', '1.0.0')).toBe(0)
    expect(compareVersions('1.0.0', '1.0.1')).toBeLessThan(0)
  })
  it('预发布低于同号正式版', () => {
    expect(compareVersions('1.2.0-beta.1', '1.2.0')).toBeLessThan(0)
    expect(compareVersions('1.2.0', '1.2.0-rc.1')).toBeGreaterThan(0)
    expect(compareVersions('1.2.0-beta.2', '1.2.0-beta.1')).toBeGreaterThan(0)
  })
})

describe('pickAsset', () => {
  const assets = [
    { name: 'Dihua-0.0.2-x64.dmg', browser_download_url: 'x64.dmg' },
    { name: 'Dihua-0.0.2-arm64.zip', browser_download_url: 'arm64.zip' },
    { name: 'Dihua-0.0.2-arm64.dmg', browser_download_url: 'arm64.dmg' },
  ]
  it('本机架构的 dmg 优先', () => {
    expect(pickAsset(assets, 'arm64')).toBe('arm64.dmg')
    expect(pickAsset(assets, 'x64')).toBe('x64.dmg')
  })
  it('没有 dmg 时退到 zip，什么都没有时 undefined', () => {
    expect(pickAsset(assets.filter((a) => a.name.endsWith('.zip')), 'arm64')).toBe('arm64.zip')
    expect(pickAsset([], 'arm64')).toBeUndefined()
  })
})

describe('describeRelease', () => {
  it('整理 tag、说明与下载链接', () => {
    const info = describeRelease(
      { tag_name: 'v0.0.2', html_url: 'https://github.com/x/dihua/releases/tag/v0.0.2', body: '  修了几个 bug  ', published_at: '2026-09-10T00:00:00Z', assets: [{ name: 'Dihua-0.0.2-arm64.dmg', browser_download_url: 'dmg' }] },
      '0.0.1',
      'arm64',
      '2026-09-10T01:00:00Z',
    )
    expect(info).toMatchObject({ current: '0.0.1', latest: '0.0.2', hasUpdate: true, downloadUrl: 'dmg', notes: '修了几个 bug' })
  })
  it('已是最新或没有 tag 时不提示更新', () => {
    expect(describeRelease({ tag_name: 'v0.0.1' }, '0.0.1', 'arm64', 'now').hasUpdate).toBe(false)
    const none = describeRelease({}, '0.0.1', 'arm64', 'now')
    expect(none.hasUpdate).toBe(false)
    expect(none.latest).toBeUndefined()
  })
})
