import React, { useCallback, useEffect, useState } from 'react'
import { App as AntApp, Avatar, Button, Divider, Dropdown, Empty, Flex, List, Space, Tag, Typography, theme } from 'antd'
import { DeleteOutlined, FolderOpenOutlined, MoreOutlined, PictureOutlined, SendOutlined, VideoCameraOutlined } from '@ant-design/icons'
import dayjs from 'dayjs'
import { useNavigate } from 'react-router-dom'
import type { HistoryStats, JobStatus, JobSummary, TargetInfo } from '@shared/types'
import iconUrl from '../assets/icon.png'

const STATUS: Record<JobStatus, { color: string; text: string }> = {
  pending: { color: 'processing', text: '待投递' },
  delivered: { color: 'success', text: '已送达' },
  cancelled: { color: 'default', text: '已取消' },
  failed: { color: 'error', text: '未送达' },
}

function when(iso: string): string {
  const d = dayjs(iso)
  if (d.isSame(dayjs(), 'day')) return `今天 ${d.format('H:mm')}`
  if (d.isSame(dayjs().subtract(1, 'day'), 'day')) return `昨天 ${d.format('H:mm')}`
  if (d.isSame(dayjs(), 'year')) return d.format('M月D日 H:mm')
  return d.format('YYYY年M月D日 H:mm')
}

function bytes(n: number): string {
  if (n < 1024) return `${n} B`
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(0)} KB`
  if (n < 1024 * 1024 * 1024) return `${(n / 1024 / 1024).toFixed(1)} MB`
  return `${(n / 1024 / 1024 / 1024).toFixed(2)} GB`
}

/** 每一条还在磁盘上的记录，最新的在最上面。 */
export default function HistoryPage(): React.JSX.Element {
  const { modal } = AntApp.useApp()
  const { token } = theme.useToken()
  const navigate = useNavigate()
  const [jobs, setJobs] = useState<JobSummary[]>([])
  const [stats, setStats] = useState<HistoryStats>({ count: 0, bytes: 0 })
  const [targets, setTargets] = useState<TargetInfo[]>([])
  const [avatar, setAvatar] = useState<string | undefined>()
  const [page, setPage] = useState(1)
  const [pageSize, setPageSize] = useState(5)

  const reload = useCallback(() => {
    void window.dihua.history.list().then(setJobs)
    void window.dihua.history.stats().then(setStats)
  }, [])

  useEffect(() => {
    reload()
    void window.dihua.targets.list().then(setTargets)
    void window.dihua.wechat.avatar().then(setAvatar)
    const off = window.dihua.history.onChange(reload)
    window.addEventListener('focus', reload)
    const timer = setInterval(reload, 5000)
    return () => {
      off()
      window.removeEventListener('focus', reload)
      clearInterval(timer)
    }
  }, [reload])

  useEffect(() => {
    const last = Math.max(1, Math.ceil(jobs.length / pageSize))
    if (page > last) setPage(last)
  }, [jobs.length, page, pageSize])

  const targetName = (id?: string): string => {
    const t = targets.find((x) => x.id === id)
    return t?.appName ?? t?.name ?? id ?? ''
  }

  /** 第三行：这条记录现在怎么样了，用语气色区分 */
  function outcome(job: JobSummary): React.ReactNode {
    switch (job.status) {
      case 'delivered':
        return (
          <Typography.Text type="secondary" style={{ fontSize: 12 }}>
            {job.deliveredAt ? `${when(job.deliveredAt)} ` : ''}递给了 {targetName(job.deliveredTo)}
          </Typography.Text>
        )
      case 'failed':
        return (
          <Typography.Text type="danger" style={{ fontSize: 12 }}>
            没递出去{job.error ? `：${job.error}` : ''}
          </Typography.Text>
        )
      case 'cancelled':
        return (
          <Typography.Text type="secondary" style={{ fontSize: 12 }}>
            已取消，文件还在工作区里
          </Typography.Text>
        )
      default:
        return (
          <Typography.Text style={{ fontSize: 12, color: token.colorPrimary }}>
            等你确认后递出去
          </Typography.Text>
        )
    }
  }

  function remove(job: JobSummary): void {
    modal.confirm({
      title: `删除「${job.title}」？`,
      content: '连同工作区里的这份记录（含图片、视频）一起删除。',
      okText: '删除',
      okButtonProps: { danger: true },
      cancelText: '取消',
      onOk: async () => {
        await window.dihua.jobs.remove(job.id, true)
        reload()
      },
    })
  }

  function clearAll(): void {
    modal.confirm({
      title: '清空全部记录？',
      content: `${stats.count} 条记录和工作区里的文件都会被删除。`,
      okText: '清空',
      okButtonProps: { danger: true },
      cancelText: '取消',
      onOk: async () => {
        await window.dihua.history.clear()
        reload()
      },
    })
  }

  return (
    <Space direction="vertical" size="middle" style={{ width: '100%' }}>
      {/* 头部：左边统计，右边整体操作 */}
      <Flex justify="space-between" align="center" wrap gap={8}>
        <Space split={<Divider type="vertical" />} size={4}>
          <Typography.Text type="secondary">
            <Typography.Text strong>{stats.count}</Typography.Text> 条记录
          </Typography.Text>
          <Typography.Text type="secondary">
            占用 <Typography.Text strong>{bytes(stats.bytes)}</Typography.Text>
          </Typography.Text>
        </Space>
        <Space>
          <Button icon={<FolderOpenOutlined />} onClick={() => window.dihua.history.revealRoot()}>
            在 Finder 中显示
          </Button>
          <Button danger type="text" icon={<DeleteOutlined />} disabled={jobs.length === 0} onClick={clearAll}>
            清空
          </Button>
        </Space>
      </Flex>

      {jobs.length === 0 ? (
        <Empty
          style={{ padding: '56px 0' }}
          description={
            <Space direction="vertical" size={4}>
              <Typography.Text>还没有记录</Typography.Text>
              <Typography.Text type="secondary" style={{ fontSize: 12 }}>
                在微信里多选聊天记录 → 转发 → 转发到其他应用 → 选择电脑中的应用 → 递话；也可以把微信导出的 zip 拖进这个窗口。
              </Typography.Text>
            </Space>
          }
        >
          <Button type="primary" ghost onClick={() => navigate('/entries')}>
            去检查入口
          </Button>
        </Empty>
      ) : (
        <List
          bordered
          dataSource={jobs}
          rowKey="id"
          style={{ background: token.colorBgContainer }}
          pagination={{
            current: page,
            pageSize,
            total: jobs.length,
            size: 'small',
            align: 'end',
            showSizeChanger: true,
            pageSizeOptions: [5, 10, 20],
            showTotal: (total, range) => `第 ${range[0]}-${range[1]} 条，共 ${total} 条`,
            onChange: (p, ps) => {
              setPage(ps !== pageSize ? 1 : p)
              setPageSize(ps)
            },
          }}
          renderItem={(job, index) => {
            const status = STATUS[job.status]
            const ordinal = (page - 1) * pageSize + index + 1
            return (
              <List.Item
                className="history-item"
                style={{ padding: '12px 16px', alignItems: 'flex-start', ['--history-hover' as string]: token.colorFillQuaternary }}
                actions={[
                  job.status === 'pending' ? (
                    <Button key="send" type="primary" ghost size="small" icon={<SendOutlined />} onClick={() => window.dihua.jobs.openConfirm(job.id)}>
                      递出去
                    </Button>
                  ) : (
                    <Button key="send" size="small" icon={<SendOutlined />} onClick={() => window.dihua.jobs.openConfirm(job.id)}>
                      再递一次
                    </Button>
                  ),
                  <Dropdown
                    key="more"
                    trigger={['click']}
                    menu={{
                      items: [
                        { key: 'reveal', icon: <FolderOpenOutlined />, label: '在 Finder 中显示', onClick: () => window.dihua.jobs.reveal(job.id) },
                        { type: 'divider' },
                        { key: 'delete', icon: <DeleteOutlined />, label: '删除', danger: true, onClick: () => remove(job) },
                      ],
                    }}
                  >
                    <Button type="text" size="small" icon={<MoreOutlined />} aria-label="更多" />
                  </Dropdown>,
                ]}
              >
                <List.Item.Meta
                  avatar={
                    <Space size={10} align="center">
                      <Typography.Text type="secondary" style={{ display: 'inline-block', minWidth: 20, textAlign: 'right', fontVariantNumeric: 'tabular-nums', fontSize: 12 }}>
                        {ordinal}
                      </Typography.Text>
                      <Avatar shape="square" size={40} src={avatar ?? iconUrl} />
                    </Space>
                  }
                  title={
                    <Space size={8} wrap>
                      <Typography.Text strong ellipsis style={{ maxWidth: 320 }}>
                        {job.title}
                      </Typography.Text>
                      <Tag color={status.color} style={{ marginInlineEnd: 0 }}>
                        {status.text}
                      </Tag>
                    </Space>
                  }
                  description={
                    <Space direction="vertical" size={2}>
                      <Space split={<Divider type="vertical" />} size={4} style={{ fontSize: 12 }}>
                        <Typography.Text type="secondary" style={{ fontSize: 12 }}>
                          {when(job.createdAt)}
                        </Typography.Text>
                        <Typography.Text type="secondary" style={{ fontSize: 12 }}>
                          {job.counts.messages} 条
                        </Typography.Text>
                        {job.counts.images > 0 && (
                          <Typography.Text type="secondary" style={{ fontSize: 12 }}>
                            <PictureOutlined /> {job.counts.images}
                          </Typography.Text>
                        )}
                        {job.counts.videos > 0 && (
                          <Typography.Text type="secondary" style={{ fontSize: 12 }}>
                            <VideoCameraOutlined /> {job.counts.videos}
                          </Typography.Text>
                        )}
                        {job.parseConfidence === 'low' && (
                          <Typography.Text type="warning" style={{ fontSize: 12 }}>
                            未识别格式，保留原文
                          </Typography.Text>
                        )}
                      </Space>
                      {outcome(job)}
                    </Space>
                  }
                />
              </List.Item>
            )
          }}
        />
      )}
    </Space>
  )
}
