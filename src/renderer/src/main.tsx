import React, { useEffect, useState } from 'react'
import ReactDOM from 'react-dom/client'
import { App as AntApp, ConfigProvider } from 'antd'
import zhCN from 'antd/locale/zh_CN'
import dayjs from 'dayjs'
import 'dayjs/locale/zh-cn'
import { HashRouter } from 'react-router-dom'
import App from './App'
import { makeTheme } from './theme'
import './styles.css'

dayjs.locale('zh-cn')

function Root(): React.JSX.Element {
  const [dark, setDark] = useState<boolean>(window.matchMedia('(prefers-color-scheme: dark)').matches)

  useEffect(() => {
    void window.dihua.theme.isDark().then(setDark)
    return window.dihua.theme.onChange(setDark)
  }, [])

  return (
    <ConfigProvider locale={zhCN} theme={makeTheme(dark)}>
      <AntApp>
        <HashRouter>
          <App />
        </HashRouter>
      </AntApp>
    </ConfigProvider>
  )
}

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <Root />
  </React.StrictMode>,
)
