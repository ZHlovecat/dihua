import React, { useEffect, useState } from 'react'
import { Button, Card, Collapse, Flex, Space, Switch, Tag, Tooltip, Typography, theme } from 'antd'
import { CloudDownloadOutlined, FileTextOutlined, FolderOpenOutlined, GithubOutlined, SyncOutlined } from '@ant-design/icons'
import type { AppInfo, Settings, UpdateInfo } from '@shared/types'
import { GITHUB_URL, RELEASES_URL } from '@shared/repo'
import BrandFlow from '../components/BrandFlow'

function when(iso?: string): string {
  if (!iso) return ''
  const d = new Date(iso)
  return Number.isNaN(d.getTime()) ? '' : d.toLocaleString('zh-CN', { hour12: false })
}

export default function AboutPage(): React.JSX.Element {
  const { token } = theme.useToken()
  const [info, setInfo] = useState<AppInfo | null>(null)
  const [settings, setSettings] = useState<Settings | null>(null)
  const [update, setUpdate] = useState<UpdateInfo | null>(null)
  const [checking, setChecking] = useState(false)

  useEffect(() => {
    void window.dihua.app.info().then(setInfo)
    void window.dihua.settings.get().then(setSettings)
    void window.dihua.update.cached().then(setUpdate)
    return window.dihua.update.onChange(setUpdate)
  }, [])

  async function check(): Promise<void> {
    setChecking(true)
    setUpdate(await window.dihua.update.check())
    setChecking(false)
  }

  async function skip(): Promise<void> {
    if (!update?.latest) return
    await window.dihua.update.skip(update.latest)
    setSettings(await window.dihua.settings.get())
  }

  const skipped = !!update?.latest && settings?.skippedUpdateVersion === update.latest
  const updateLine = ((): { text: string; type?: 'secondary' | 'success' | 'danger' } => {
    if (checking) return { text: '正在检查…', type: 'secondary' }
    if (!update) return { text: '还没检查过', type: 'secondary' }
    if (update.error) return { text: `检查失败：${update.error}`, type: 'danger' }
    if (update.hasUpdate) return { text: `有新版本 ${update.latest}${update.publishedAt ? `，发布于 ${when(update.publishedAt)}` : ''}${skipped ? '（已跳过）' : ''}` }
    if (update.latest) return { text: '已是最新版本', type: 'success' }
    return { text: '仓库还没有发布过版本', type: 'secondary' }
  })()

  const files: Array<{ label: string; path?: string; open: () => void }> = [
    { label: '工作区', path: settings?.workspaceRoot, open: () => void window.dihua.history.revealRoot() },
    { label: '数据目录', path: info?.userDataDir, open: () => info && void window.dihua.app.openPath(info.userDataDir) },
    { label: '日志', path: info?.logFile, open: () => info && void window.dihua.app.openPath(info.logFile) },
  ]

  return (
    <Space direction="vertical" size="large" style={{ width: '100%' }}>
      {/* 品牌区：投递动效图在上，名字与 slogan 在下 */}
      <Flex
        vertical
        align="center"
        gap={12}
        style={{
          padding: '20px 24px 28px',
          borderRadius: token.borderRadiusLG,
          background: `linear-gradient(180deg, ${token.colorPrimaryBg} 0%, ${token.colorBgContainer} 100%)`,
          border: `1px solid ${token.colorBorderSecondary}`,
        }}
      >
        <BrandFlow />
        <Flex vertical align="center" gap={2}>
          <Typography.Title level={2} style={{ margin: 0, letterSpacing: '0.04em' }}>
            递话
          </Typography.Title>
          <Typography.Text type="secondary" style={{ fontSize: 13, letterSpacing: '0.16em', textTransform: 'uppercase' }}>
            Dihua
          </Typography.Text>
        </Flex>
        <Typography.Text style={{ fontSize: 15 }}>把微信里的话，递给任何 AI。</Typography.Text>
        <Space size={6}>
          <Tag style={{ marginInlineEnd: 0 }}>版本 {info?.version ?? '—'}</Tag>
          {info && !info.isPackaged && (
            <Tag color="warning" style={{ marginInlineEnd: 0 }}>
              开发模式
            </Tag>
          )}
        </Space>
      </Flex>

      {/* 更新：读 GitHub Releases，只提示和给下载链接，不做静默替换（ad-hoc 签名的应用做不了） */}
      <Card
        size="small"
        title={
          <Space size={6}>
            <CloudDownloadOutlined />
            <span>更新</span>
          </Space>
        }
        extra={
          <Button type="text" size="small" icon={<GithubOutlined />} onClick={() => void window.dihua.app.openExternal(GITHUB_URL)}>
            GitHub
          </Button>
        }
      >
        <Space direction="vertical" size="middle" style={{ width: '100%' }}>
          <Flex align="center" justify="space-between" gap={12} wrap>
            <div style={{ minWidth: 0 }}>
              <Typography.Text strong>当前版本 {info?.version ?? '—'}</Typography.Text>
              <Typography.Paragraph type={updateLine.type} style={{ margin: '4px 0 0' }}>
                {updateLine.text}
              </Typography.Paragraph>
              {update?.checkedAt && (
                <Typography.Text type="secondary" style={{ fontSize: 12 }}>
                  上次检查 {when(update.checkedAt)}
                </Typography.Text>
              )}
            </div>
            <Space wrap>
              {update?.hasUpdate && (
                <Button type="primary" icon={<CloudDownloadOutlined />} onClick={() => void window.dihua.app.openExternal(update.downloadUrl ?? update.releaseUrl ?? RELEASES_URL)}>
                  下载 {update.latest}
                </Button>
              )}
              {update?.hasUpdate && !skipped && <Button onClick={skip}>跳过这个版本</Button>}
              <Button icon={<SyncOutlined spin={checking} />} loading={checking} onClick={check}>
                检查更新
              </Button>
            </Space>
          </Flex>

          {update?.hasUpdate && update.notes && (
            <Collapse
              ghost
              size="small"
              items={[
                {
                  key: 'notes',
                  label: `${update.latest} 的更新说明`,
                  children: (
                    <Typography.Paragraph className="selectable" style={{ margin: 0 }}>
                      <pre className="pre">{update.notes.slice(0, 2000)}</pre>
                    </Typography.Paragraph>
                  ),
                },
              ]}
            />
          )}

          <Flex align="center" justify="space-between" gap={12} style={{ borderTop: `1px solid ${token.colorBorderSecondary}`, paddingTop: 12 }}>
            <div>
              <Typography.Text>自动检查更新</Typography.Text>
              <Typography.Paragraph type="secondary" style={{ margin: 0, fontSize: 12 }}>
                打开递话时每天最多查一次，有新版本弹系统通知。
              </Typography.Paragraph>
            </div>
            <Switch checked={settings?.autoCheckUpdates ?? true} onChange={(v) => void window.dihua.settings.set({ autoCheckUpdates: v }).then(setSettings)} />
          </Flex>
          <Typography.Link onClick={() => void window.dihua.app.openExternal(RELEASES_URL)} style={{ fontSize: 12 }}>
            查看所有版本
          </Typography.Link>
        </Space>
      </Card>

      {/* 文件位置：标签 + 可复制、可省略的路径 + 打开按钮 */}
      <Card
        size="small"
        title={
          <Space size={6}>
            <FileTextOutlined />
            <span>文件</span>
          </Space>
        }
        styles={{ body: { padding: '4px 12px' } }}
      >
        {files.map((f, i) => (
          <Flex
            key={f.label}
            align="center"
            gap={12}
            style={{ padding: '10px 0', borderTop: i === 0 ? undefined : `1px solid ${token.colorBorderSecondary}` }}
          >
            <Typography.Text strong style={{ flex: '0 0 64px' }}>
              {f.label}
            </Typography.Text>
            <Typography.Text
              type="secondary"
              className="selectable"
              ellipsis={{ tooltip: f.path }}
              copyable={f.path ? { text: f.path, tooltips: ['复制路径', '已复制'] } : false}
              style={{ flex: 1, minWidth: 0, fontFamily: token.fontFamilyCode, fontSize: 12 }}
            >
              {f.path ?? '—'}
            </Typography.Text>
            <Tooltip title="在 Finder 中打开">
              <Button size="small" icon={<FolderOpenOutlined />} onClick={f.open} disabled={!f.path}>
                打开
              </Button>
            </Tooltip>
          </Flex>
        ))}
      </Card>

    </Space>
  )
}
