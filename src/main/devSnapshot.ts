import { mkdirSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import { BrowserWindow, nativeTheme } from 'electron'
import log from './log'

const ROUTES = ['/general', '/entries', '/targets', '/history', '/about']

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms))

/**
 * 开发用：DIHUA_SNAPSHOT_DIR 指定目录时，把每个面板在浅色/深色下各截一张图，
 * 供没有屏幕的环境（比如 CI 或代理）检查界面。打包版不会带这个环境变量。
 */
export async function snapshotTour(main: BrowserWindow, confirm?: BrowserWindow): Promise<void> {
  const dir = process.env.DIHUA_SNAPSHOT_DIR
  if (!dir) return
  mkdirSync(dir, { recursive: true })
  await sleep(1200)
  // 侧边栏状态存在 localStorage，和正式版共用同一份；截图前先展开，免得上次残留的收起态混进来
  await main.webContents.executeJavaScript(`localStorage.setItem('dihua.sidebarCollapsed', '0'); document.querySelector('[aria-label="展开侧边栏"]')?.click()`)
  await sleep(400)
  for (const theme of ['light', 'dark'] as const) {
    nativeTheme.themeSource = theme
    await sleep(500)
    for (const route of ROUTES) {
      main.webContents.send('nav', route)
      await sleep(1000)
      const img = await main.webContents.capturePage()
      writeFileSync(join(dir, `${theme}-${route.slice(1)}.png`), img.toPNG())
    }
    if (confirm && !confirm.isDestroyed()) {
      confirm.focus()
      await sleep(400)
      const img = await confirm.webContents.capturePage()
      writeFileSync(join(dir, `${theme}-confirm.png`), img.toPNG())
    }
  }
  // 侧边栏收起态：点一下「收起侧边栏」按钮截一张，再点「展开」还原
  nativeTheme.themeSource = 'light'
  main.webContents.send('nav', '/general')
  await sleep(500)
  const click = (label: string): Promise<unknown> =>
    main.webContents.executeJavaScript(`document.querySelector('[aria-label="${label}"]')?.click()`)
  await click('收起侧边栏')
  await sleep(700)
  writeFileSync(join(dir, 'light-general-collapsed.png'), (await main.webContents.capturePage()).toPNG())
  await click('展开侧边栏')
  // 关于页：点一次「检查更新」，把真实的检查结果也截下来（没网或仓库没发布时显示相应状态）
  main.webContents.send('nav', '/about')
  await sleep(500)
  await main.webContents.executeJavaScript(`[...document.querySelectorAll('button')].find((b) => b.textContent?.includes('检查更新'))?.click()`)
  await sleep(4000)
  writeFileSync(join(dir, 'light-about-checked.png'), (await main.webContents.capturePage()).toPNG())
  // 多等一会儿让 localStorage 落盘，app.exit 不会替它冲刷
  await sleep(1500)
  nativeTheme.themeSource = 'system'
  log.info(`[snapshot] written to ${dir}`)
}
