import React, { useCallback, useEffect, useState } from 'react'
import { App as AntApp, Button, Card, Flex, List, Space, Switch, Tag, Typography, theme } from 'antd'
import { AppstoreOutlined, ReloadOutlined } from '@ant-design/icons'
import type { Settings, TargetInfo } from '@shared/types'
import { TargetIcon } from '../components/TargetIcon'

/** 递话能递给哪些 AI 应用：每个一行，右侧开关决定它出不出现在确认窗里。 */
export default function TargetsPage(): React.JSX.Element {
  const { message } = AntApp.useApp()
  const { token } = theme.useToken()
  const [targets, setTargets] = useState<TargetInfo[]>([])
  const [settings, setSettings] = useState<Settings | null>(null)
  const [busy, setBusy] = useState<string | null>(null)

  const reload = useCallback(async () => {
    const [t, s] = await Promise.all([window.dihua.targets.list(), window.dihua.settings.get()])
    setTargets(t)
    setSettings(s)
  }, [])

  useEffect(() => {
    void reload()
    const onFocus = (): void => void reload()
    window.addEventListener('focus', onFocus)
    return () => window.removeEventListener('focus', onFocus)
  }, [reload])

  async function toggle(t: TargetInfo, enabled: boolean): Promise<void> {
    setBusy(t.id)
    setTargets(await window.dihua.targets.setEnabled(t.id, enabled))
    setSettings(await window.dihua.settings.get())
    setBusy(null)
  }

  async function setDefault(t: TargetInfo): Promise<void> {
    setSettings(await window.dihua.settings.set({ defaultTargetId: t.id }))
    message.success(`默认递给 ${t.appName ?? t.name}`)
  }

  const enabledCount = targets.filter((t) => t.enabled).length

  return (
    <Space direction="vertical" size="middle" style={{ width: '100%' }}>
      <Typography.Paragraph type="secondary" style={{ marginTop: -8 }}>
        递话把整理好的聊天记录交给这些应用。关掉的不会出现在投递确认窗里。
      </Typography.Paragraph>

      <Card
        size="small"
        title={
          <Space size={6}>
            <AppstoreOutlined />
            <span>可以递给</span>
            <Typography.Text type="secondary" style={{ fontWeight: 400, fontSize: 12 }}>
              已开启 {enabledCount} / {targets.length}
            </Typography.Text>
          </Space>
        }
        extra={<Button type="text" size="small" icon={<ReloadOutlined />} title="重新检测" onClick={() => void reload()} />}
        styles={{ body: { paddingBlock: 0 } }}
      >
        <List
          dataSource={targets}
          rowKey="id"
          renderItem={(t) => {
            const isDefault = settings?.defaultTargetId === t.id && t.enabled
            return (
              <List.Item style={{ padding: '14px 0', opacity: t.enabled ? 1 : 0.55, transition: 'opacity 0.15s' }}>
                <Flex align="center" gap={14} style={{ width: '100%' }}>
                  {/* 图标：带浅底的方块，和记录页头像同尺寸 */}
                  <Flex
                    align="center"
                    justify="center"
                    style={{ width: 40, height: 40, borderRadius: token.borderRadius, background: token.colorFillQuaternary, flex: '0 0 auto' }}
                  >
                    <TargetIcon target={t} size={22} />
                  </Flex>

                  <Flex vertical gap={2} style={{ flex: 1, minWidth: 0 }}>
                    <Space size={8} wrap>
                      <Typography.Text strong>{t.appName ?? t.name}</Typography.Text>
                      <Tag color={t.available ? 'success' : 'warning'} style={{ marginInlineEnd: 0 }}>
                        {t.available ? '已安装' : '未安装'}
                      </Tag>
                      {isDefault && (
                        <Tag color="processing" style={{ marginInlineEnd: 0 }}>
                          默认
                        </Tag>
                      )}
                    </Space>
                    <Typography.Text type="secondary" style={{ fontSize: 12 }}>
                      {t.available ? t.description : t.installHint}
                    </Typography.Text>
                  </Flex>

                  <Space size="middle">
                    {t.enabled && !isDefault && (
                      <Button size="small" disabled={!t.available} onClick={() => setDefault(t)}>
                        设为默认
                      </Button>
                    )}
                    <Switch checked={t.enabled} loading={busy === t.id} onChange={(v) => toggle(t, v)} />
                  </Space>
                </Flex>
              </List.Item>
            )
          }}
        />
      </Card>
    </Space>
  )
}
