import { theme as antdTheme, type ThemeConfig } from 'antd'

/**
 * 颜色全部用 Ant Design 默认主题：不改主色、不改灰阶、不改圆角，
 * 只根据系统深浅色切换算法；字体走系统中文字体栈。
 */
export const FONT_FAMILY =
  '-apple-system, BlinkMacSystemFont, "SF Pro Text", "PingFang SC", "Hiragino Sans GB", "Helvetica Neue", "Microsoft YaHei", sans-serif'

export function makeTheme(dark: boolean): ThemeConfig {
  return {
    algorithm: dark ? antdTheme.darkAlgorithm : antdTheme.defaultAlgorithm,
    token: { fontFamily: FONT_FAMILY },
  }
}
