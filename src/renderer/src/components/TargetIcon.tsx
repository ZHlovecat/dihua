import React from 'react'
import { OpenAIOutlined } from '@ant-design/icons'
import type { TargetInfo } from '@shared/types'
import { CLAUDE_SVG_INNER, GEMINI_SVG_INNER } from '../assets/brandLogos'

/** 目标应用的图标：能用品牌图标的就用（ChatGPT → OpenAI 线框，Claude → 橙色星芒，Gemini → 四色星），其他回退到系统给的 App 图标。 */
export function TargetIcon({ target, size = 20 }: { target: Pick<TargetInfo, 'id' | 'name' | 'icon'>; size?: number }): React.JSX.Element {
  if (target.id === 'codex') return <OpenAIOutlined style={{ fontSize: size }} />
  if (target.id === 'gemini') {
    return <svg viewBox="0 0 48 48" width={size} height={size} style={{ display: 'block' }} aria-hidden dangerouslySetInnerHTML={{ __html: GEMINI_SVG_INNER }} />
  }
  if (target.id === 'claude') {
    return <svg viewBox="0 0 48 48" width={size} height={size} style={{ display: 'block' }} aria-hidden dangerouslySetInnerHTML={{ __html: CLAUDE_SVG_INNER }} />
  }
  if (target.icon) return <img src={target.icon} alt="" width={size} height={size} style={{ borderRadius: Math.round(size / 4) }} />
  return <span>{target.name.slice(0, 1)}</span>
}
