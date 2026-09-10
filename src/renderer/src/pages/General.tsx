import React, { useEffect, useState } from 'react'
import { Button, List, Select, Space, Switch, Typography } from 'antd'
import { BgColorsOutlined, ClockCircleOutlined, FolderOutlined, SendOutlined } from '@ant-design/icons'
import type { Settings, TargetInfo } from '@shared/types'
import SvgCard from '../components/SvgCard'
import ThemePicker from '../components/ThemePicker'

function Row({ title, detail, mono, children }: { title: string; detail?: string; mono?: boolean; children: React.ReactNode }): React.JSX.Element {
  return (
    <List.Item>
      <List.Item.Meta
        title={title}
        description={
          detail ? (
            mono ? (
              <Typography.Text type="secondary" code>
                {detail}
              </Typography.Text>
            ) : (
              detail
            )
          ) : undefined
        }
      />
      <Space>{children}</Space>
    </List.Item>
  )
}

export default function GeneralPage(): React.JSX.Element {
  const [settings, setSettings] = useState<Settings | null>(null)
  const [targets, setTargets] = useState<TargetInfo[]>([])

  useEffect(() => {
    void Promise.all([window.dihua.settings.get(), window.dihua.targets.list()]).then(([s, t]) => {
      setSettings(s)
      setTargets(t)
    })
  }, [])

  async function patch(p: Partial<Settings>): Promise<void> {
    setSettings(await window.dihua.settings.set(p))
  }

  async function chooseDir(): Promise<void> {
    const dir = await window.dihua.settings.chooseWorkspace()
    if (dir) await patch({ workspaceRoot: dir })
  }

  if (!settings) return <></>
  const defaultTarget = targets.find((t) => t.id === settings.defaultTargetId && t.enabled)

  return (
    <Space direction="vertical" size="middle" style={{ width: '100%' }}>
      <SvgCard title="外观" icon={<BgColorsOutlined />} decor="blobs">
        <ThemePicker value={settings.themeMode} onChange={(mode) => patch({ themeMode: mode })} />
      </SvgCard>

      <SvgCard title="工作区" icon={<FolderOutlined />} decor="none" bodyPadding="0 12px">
        <List split>
          <Row title="目录" detail={settings.workspaceRoot} mono>
            <Button size="small" onClick={() => window.dihua.history.revealRoot()}>
              在 Finder 中显示
            </Button>
            <Button size="small" onClick={chooseDir}>
              更改…
            </Button>
          </Row>
        </List>
      </SvgCard>

      <SvgCard title="投递" icon={<SendOutlined />} decor="none" bodyPadding="0 12px">
        <List split>
          <Row
            title="收到记录后直接递出去"
            detail={
              defaultTarget?.available
                ? '不弹确认窗。微信「转发到其他应用」里会按目标应用分开列出（递给 ChatGPT、递给 Claude…），点哪个就直接递给哪个；从别处递来的交给默认目标。'
                : '需要先在「目标应用」里有一个可用的默认目标。'
            }
          >
            <Switch checked={settings.skipConfirm} disabled={!defaultTarget?.available} onChange={(v) => patch({ skipConfirm: v })} />
          </Row>
          <Row title="保留微信导出的原始 zip" detail="放在每条记录的 原始/ 目录里，解析出问题时可以拿它复现。">
            <Switch checked={settings.keepOriginalZip} onChange={(v) => patch({ keepOriginalZip: v })} />
          </Row>
        </List>
      </SvgCard>

      <SvgCard title="记录" icon={<ClockCircleOutlined />} decor="none" bodyPadding="0 12px">
        <List split>
          <Row title="自动清理" detail="已递出或已取消的记录，超过这个时长连同文件一起删除；待投递的不动。">
            <Select
              value={settings.retentionDays}
              onChange={(v) => patch({ retentionDays: v })}
              options={[
                { value: 1, label: '1 天' },
                { value: 7, label: '7 天' },
                { value: 30, label: '30 天' },
                { value: 0, label: '从不' },
              ]}
              style={{ width: 120 }}
            />
          </Row>
        </List>
      </SvgCard>
    </Space>
  )
}
