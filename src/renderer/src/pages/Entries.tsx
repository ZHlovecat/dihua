import React, { useCallback, useEffect, useState } from 'react'
import { Button, Card, Flex, Space, Spin, Switch, Tag, Typography, theme } from 'antd'
import { BulbOutlined, SettingOutlined } from '@ant-design/icons'
import type { ShareEntriesInfo, ShareEntryState } from '@shared/types'
import EntryIllustration from '../components/EntryIllustration'
import HowToSteps from '../components/HowToSteps'

const STATE: Record<ShareEntryState, { color: string; text: string }> = {
  enabled: { color: 'success', text: '已开启' },
  disabled: { color: 'default', text: '已关闭' },
  unregistered: { color: 'warning', text: '未登记' },
}

/** 微信「转发到其他应用 → 选择电脑中的应用」读的是系统共享菜单；这里的开关写的就是那个设置。 */
export default function EntriesPage(): React.JSX.Element {
  const { token } = theme.useToken()
  const [state, setState] = useState<ShareEntryState | null>(null)
  const [info, setInfo] = useState<ShareEntriesInfo | null>(null)
  const [busy, setBusy] = useState(false)

  const refresh = useCallback(() => {
    void window.dihua.entries.info().then((i) => {
      setInfo(i)
      setState(i.state)
    })
  }, [])

  useEffect(() => {
    refresh()
    window.addEventListener('focus', refresh)
    return () => window.removeEventListener('focus', refresh)
  }, [refresh])

  async function toggle(on: boolean): Promise<void> {
    setBusy(true)
    setState(on ? 'enabled' : 'disabled')
    await window.dihua.entries.setEnabled(on)
    refresh()
    setBusy(false)
  }

  const names = info?.names.length ? info.names.map((n) => `「${n}」`).join('') : '「递话」'

  return (
    <Space direction="vertical" size="middle" style={{ width: '100%' }}>
      {/* 开通卡：左边状态与开关，右边菜单示意图 */}
      <Card
        styles={{ body: { padding: 0 } }}
        style={{ overflow: 'hidden' }}
        extra={
          <Button type="text" size="small" icon={<SettingOutlined />} onClick={() => window.dihua.entries.openSettings()}>
            系统设置
          </Button>
        }
        title={
          <Space size={8}>
            <span>转发菜单里的入口</span>
            {state && (
              <Tag color={STATE[state].color} style={{ marginInlineEnd: 0 }}>
                {STATE[state].text}
              </Tag>
            )}
          </Space>
        }
      >
        <Flex align="stretch" wrap>
          <Flex vertical justify="center" gap={16} style={{ flex: '1 1 200px', minWidth: 0, padding: '20px 24px' }}>
            <div>
              <Typography.Title level={4} style={{ margin: '0 0 6px' }}>
                在微信里直接递
              </Typography.Title>
              <Typography.Paragraph type="secondary" style={{ margin: 0 }}>
                打开后，微信「转发到其他应用 → 选择电脑中的应用」里会出现{names}；关掉立刻消失。
              </Typography.Paragraph>
              {info?.direct && (
                <Typography.Paragraph type="secondary" style={{ margin: '6px 0 0', fontSize: 12 }}>
                  开了「收到记录后直接递出去」，所以入口按目标应用分开列出：点哪个就直接递给哪个，不弹确认窗。
                </Typography.Paragraph>
              )}
            </div>

            {state === null ? (
              <Spin size="small" />
            ) : state === 'unregistered' ? (
              <Typography.Text type="warning">系统还没登记这个入口。递话需要从「应用程序」文件夹里以打包版运行一次，而不是开发模式。</Typography.Text>
            ) : (
              <Flex align="center" gap={12}>
                <Switch checked={state === 'enabled'} loading={busy} onChange={toggle} />
                <Typography.Text strong>{state === 'enabled' ? `已显示在转发菜单里：${names}` : '已从转发菜单里隐藏'}</Typography.Text>
              </Flex>
            )}
          </Flex>

          <Flex
            align="center"
            justify="center"
            style={{
              flex: '0 0 260px',
              padding: '16px 12px',
              background: `linear-gradient(135deg, ${token.colorPrimaryBg} 0%, ${token.colorBgLayout} 100%)`,
              borderInlineStart: `1px solid ${token.colorBorderSecondary}`,
            }}
          >
            <EntryIllustration state={state} />
          </Flex>
        </Flex>
      </Card>

      {/* 怎么用：横向三步 */}
      <Card
        size="small"
        title={
          <Space size={6}>
            <BulbOutlined />
            <span>怎么用</span>
          </Space>
        }
      >
        <HowToSteps />
      </Card>
    </Space>
  )
}
