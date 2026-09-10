import React, { useCallback, useEffect, useState } from 'react'
import { App as AntApp, Button, Layout, Menu, Typography, theme } from 'antd'
import { AppstoreOutlined, ExportOutlined, HistoryOutlined, InfoCircleOutlined, MenuFoldOutlined, MenuUnfoldOutlined, SlidersOutlined } from '@ant-design/icons'
import { Outlet, useLocation, useNavigate } from 'react-router-dom'

const { Sider, Content } = Layout

const TABS = [
  { key: '/general', icon: <SlidersOutlined />, label: '通用' },
  { key: '/entries', icon: <ExportOutlined />, label: '入口' },
  { key: '/targets', icon: <AppstoreOutlined />, label: '目标应用' },
  { key: '/history', icon: <HistoryOutlined />, label: '记录' },
  { key: '/about', icon: <InfoCircleOutlined />, label: '关于' },
]

const SIDEBAR_KEY = 'dihua.sidebarCollapsed'
/** 收起后只留图标；80 比 macOS 红绿灯（约到 x=66）宽，分界线不会压在灯上 */
const SIDER_WIDTH = 200
const SIDER_COLLAPSED_WIDTH = 80

function readCollapsed(): boolean {
  try {
    return localStorage.getItem(SIDEBAR_KEY) === '1'
  } catch {
    return false
  }
}

/** 递话唯一的设置窗：antd Layout，左侧 Sider + Menu（可一键收起成图标栏），右侧可滚动 Content。 */
export default function MainLayout(): React.JSX.Element {
  const navigate = useNavigate()
  const location = useLocation()
  const { message } = AntApp.useApp()
  const { token } = theme.useToken()
  const [dragging, setDragging] = useState(false)
  const [collapsed, setCollapsed] = useState(readCollapsed)
  const current = TABS.find((t) => t.key === location.pathname) ?? TABS[3]

  const toggleSidebar = useCallback(() => setCollapsed((c) => !c), [])

  useEffect(() => {
    try {
      localStorage.setItem(SIDEBAR_KEY, collapsed ? '1' : '0')
    } catch {
      /* 拿不到 localStorage 时只在本次生效 */
    }
  }, [collapsed])

  // ⌘B 也能收起/展开，和常见 macOS 应用一致
  useEffect(() => {
    const onKey = (e: KeyboardEvent): void => {
      if (e.metaKey && !e.shiftKey && !e.altKey && e.key.toLowerCase() === 'b') {
        e.preventDefault()
        toggleSidebar()
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [toggleSidebar])

  const toggleButton = (
    <Button
      type="text"
      size="small"
      icon={collapsed ? <MenuUnfoldOutlined /> : <MenuFoldOutlined />}
      onClick={toggleSidebar}
      title={collapsed ? '展开侧边栏（⌘B）' : '收起侧边栏（⌘B）'}
      aria-label={collapsed ? '展开侧边栏' : '收起侧边栏'}
    />
  )

  const onDrop = useCallback(
    async (e: React.DragEvent) => {
      e.preventDefault()
      setDragging(false)
      const paths = Array.from(e.dataTransfer.files)
        .map((f) => window.dihua.files.pathFor(f))
        .filter((p) => p.toLowerCase().endsWith('.zip'))
      if (paths.length === 0) {
        message.warning('请拖入微信导出的 zip 文件')
        return
      }
      const results = await window.dihua.jobs.importPaths(paths)
      for (const r of results) if (!r.ok) message.error(`${r.path.split('/').pop()}：${r.error}`)
    },
    [message],
  )

  return (
    <Layout
      style={{ height: '100vh', outline: dragging ? `2px dashed ${token.colorPrimary}` : 'none', outlineOffset: -6 }}
      onDragOver={(e) => {
        e.preventDefault()
        setDragging(true)
      }}
      onDragLeave={() => setDragging(false)}
      onDrop={onDrop}
    >
      <Sider
        width={SIDER_WIDTH}
        collapsedWidth={SIDER_COLLAPSED_WIDTH}
        collapsible
        collapsed={collapsed}
        trigger={null}
        theme="light"
        style={{ borderInlineEnd: `1px solid ${token.colorBorderSecondary}` }}
      >
        {/* 标题行：红绿灯在左边，收起按钮靠右；收起后按钮挪到内容区标题行，避开红绿灯。
            用普通 div 而不是 antd Flex：Flex 没有子节点时会被渲染成 0 高，标题行就没了 */}
        <div className="drag-region" style={{ height: 38, display: 'flex', alignItems: 'center', justifyContent: 'flex-end', paddingInlineEnd: 8 }}>
          {!collapsed && toggleButton}
        </div>
        <Menu mode="inline" selectedKeys={[current.key]} items={TABS} onClick={(e) => navigate(e.key)} style={{ borderInlineEnd: 0 }} />
        {!collapsed && (
          <Typography.Text type="secondary" style={{ position: 'absolute', bottom: 16, left: 24, fontSize: 12, whiteSpace: 'nowrap' }}>
            把微信里的话，递给任何 AI
          </Typography.Text>
        )}
      </Sider>
      <Layout>
        <div className="drag-region" style={{ height: 38, flex: '0 0 38px', display: 'flex', alignItems: 'center', paddingInlineStart: 8 }}>
          {collapsed && toggleButton}
        </div>
        <Content style={{ padding: '0 24px 24px', overflow: 'auto' }}>
          <Typography.Title level={2} style={{ marginTop: 0 }}>
            {current.label}
          </Typography.Title>
          <Outlet />
        </Content>
      </Layout>
    </Layout>
  )
}
