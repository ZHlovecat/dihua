import React, { useEffect, useState } from 'react'
import { theme } from 'antd'
import iconUrl from '../assets/icon.png'
import { CLAUDE_SVG_INNER, GEMINI_SVG_INNER, OPENAI_PATHS, WECHAT_PATHS } from '../assets/brandLogos'

/**
 * 关于页品牌区的「投递图」：微信 → 递话 → ChatGPT / Gemini / Claude。
 * 纯内联 SVG + SMIL：所有动画共用 4s 周期，用 keyTimes 把各自的动作放进周期里的时间窗，天然同步。
 *   0.2–1.0s  绿点从微信飞到递话
 *   1.0–1.6s  递话图标弹一下并扩一圈涟漪
 *   1.1–1.9s  三个品牌色的点错开 0.15s 飞向三个 AI（曲线上有一段流动亮线）
 *   到达时     目标 logo 放大加光晕
 *   其余时间   静止
 * 系统「减弱动态效果」时只渲染静态图。
 */
const CYCLE = 4
/** 画布 620×200；递话图标放在正中（x=310），这样它和下方居中的名字在同一条竖线上 */
const VIEW_W = 620
const DIHUA = { x: VIEW_W / 2, y: 100 }
const WECHAT = { x: 76, y: 100 }
const TARGETS = [
  { id: 'openai', x: 520, y: 40, color: 'currentColor' },
  { id: 'gemini', x: 520, y: 100, color: '#4285F4' },
  { id: 'claude', x: 520, y: 160, color: '#D97757' },
] as const

const PATH_IN = `M ${WECHAT.x + 30} ${WECHAT.y} C ${WECHAT.x + 110} ${WECHAT.y}, ${DIHUA.x - 100} ${DIHUA.y}, ${DIHUA.x - 38} ${DIHUA.y}`
const pathOut = (ty: number): string =>
  `M ${DIHUA.x + 38} ${DIHUA.y} C ${DIHUA.x + 110} ${DIHUA.y}, ${DIHUA.x + 130} ${ty}, ${TARGETS[0].x - 26} ${ty}`

/** 把 [from, to]（秒）映射成 4s 周期里的 keyTimes；返回 keyTimes 与位置/透明度序列 */
function timeWindow(from: number, to: number): { keyTimes: string; keyPoints: string; opacity: string; opacityTimes: string } {
  const a = from / CYCLE
  const b = to / CYCLE
  const eps = 0.005
  return {
    keyTimes: `0;${a};${b};1`,
    keyPoints: '0;0;1;1',
    opacity: '0;0;1;1;0;0',
    opacityTimes: `0;${Math.max(0, a - eps)};${a};${b};${Math.min(1, b + eps)};1`,
  }
}

function MovingDot({ path, from, to, color, r = 5 }: { path: string; from: number; to: number; color: string; r?: number }): React.JSX.Element {
  const w = timeWindow(from, to)
  return (
    <circle r={r} fill={color} opacity={0}>
      <animateMotion dur={`${CYCLE}s`} repeatCount="indefinite" path={path} calcMode="linear" keyTimes={w.keyTimes} keyPoints={w.keyPoints} />
      <animate attributeName="opacity" dur={`${CYCLE}s`} repeatCount="indefinite" values={w.opacity} keyTimes={w.opacityTimes} />
    </circle>
  )
}

/** 曲线上跟着点走的一段亮线 */
function GlowTrail({ path, from, to, color }: { path: string; from: number; to: number; color: string }): React.JSX.Element {
  const w = timeWindow(from, to)
  return (
    <path d={path} fill="none" stroke={color} strokeWidth={2} strokeLinecap="round" pathLength={100} strokeDasharray="14 100" opacity={0}>
      <animate attributeName="stroke-dashoffset" dur={`${CYCLE}s`} repeatCount="indefinite" values="114;114;-14;-14" keyTimes={w.keyTimes} calcMode="linear" />
      <animate attributeName="opacity" dur={`${CYCLE}s`} repeatCount="indefinite" values="0;0;0.9;0.9;0;0" keyTimes={w.opacityTimes} />
    </path>
  )
}

/** 到达时的一次「弹一下 + 光晕」：scale 用 additive 的 animateTransform，光晕是同心圆的 r/opacity */
function Pulse({ at, color, radius = 26 }: { at: number; color: string; radius?: number }): React.JSX.Element {
  const a = at / CYCLE
  const b = Math.min(1, (at + 0.6) / CYCLE)
  const mid = (a + b) / 2
  return (
    <>
      <circle r={radius} fill="none" stroke={color} strokeWidth={1.5} opacity={0}>
        <animate attributeName="r" dur={`${CYCLE}s`} repeatCount="indefinite" values={`${radius};${radius};${radius + 18};${radius + 18}`} keyTimes={`0;${a};${b};1`} />
        <animate attributeName="opacity" dur={`${CYCLE}s`} repeatCount="indefinite" values="0;0;0.55;0;0" keyTimes={`0;${a};${mid};${b};1`} />
      </circle>
    </>
  )
}

function bump(at: number): React.JSX.Element {
  const a = at / CYCLE
  const peak = (at + 0.18) / CYCLE
  const b = (at + 0.4) / CYCLE
  return (
    <animateTransform
      attributeName="transform"
      type="scale"
      additive="sum"
      dur={`${CYCLE}s`}
      repeatCount="indefinite"
      values="1;1;1.12;1;1"
      keyTimes={`0;${a};${peak};${b};1`}
      calcMode="spline"
      keySplines="0 0 1 1;0.2 0.8 0.2 1;0.4 0 0.6 1;0 0 1 1"
    />
  )
}

export default function BrandFlow(): React.JSX.Element {
  const { token } = theme.useToken()
  const [animate, setAnimate] = useState(true)
  useEffect(() => {
    const mq = window.matchMedia('(prefers-reduced-motion: reduce)')
    const apply = (): void => setAnimate(!mq.matches)
    apply()
    mq.addEventListener('change', apply)
    return () => mq.removeEventListener('change', apply)
  }, [])

  const line = token.colorBorder
  const outPaths = TARGETS.map((t) => pathOut(t.y))
  // 出发时刻：三条错开 0.15s，飞行 0.8s
  const departs = [1.1, 1.25, 1.4]

  return (
    <svg viewBox={`0 0 ${VIEW_W} 200`} width="100%" style={{ maxWidth: VIEW_W, height: 'auto', display: 'block', color: token.colorText }} role="img" aria-label="微信的聊天记录经递话送到 ChatGPT、Gemini 和 Claude">
      {/* 连线 */}
      <path d={PATH_IN} fill="none" stroke={line} strokeWidth={1.5} strokeDasharray="4 5" />
      {outPaths.map((d, i) => (
        <path key={i} d={d} fill="none" stroke={line} strokeWidth={1.5} strokeDasharray="4 5" />
      ))}

      {/* 微信 */}
      <g transform={`translate(${WECHAT.x} ${WECHAT.y})`}>
        <g>
          {animate && bump(0.1)}
          <g transform="translate(-24 -24) scale(0.0536)" fill="#07C160">
            <g transform="translate(-64 -64)">
              {WECHAT_PATHS.map((d, i) => (
                <path key={i} d={d} />
              ))}
            </g>
          </g>
        </g>
      </g>

      {/* 递话 */}
      <g transform={`translate(${DIHUA.x} ${DIHUA.y})`}>
        {animate && <Pulse at={1.0} color={token.colorPrimary} radius={34} />}
        <g>
          {animate && bump(1.0)}
          <image href={iconUrl} x={-34} y={-34} width={68} height={68} />
        </g>
      </g>

      {/* 三个目标 */}
      {TARGETS.map((t, i) => (
        <g key={t.id} transform={`translate(${t.x} ${t.y})`}>
          {animate && <Pulse at={departs[i] + 0.8} color={t.color === 'currentColor' ? token.colorText : t.color} radius={22} />}
          <g>
            {animate && bump(departs[i] + 0.8)}
            {t.id === 'openai' && (
              <g transform="translate(-18 -18) scale(0.0402)" fill="currentColor">
                <g transform="translate(-64 -64)">
                  {OPENAI_PATHS.map((d, j) => (
                    <path key={j} d={d} />
                  ))}
                </g>
              </g>
            )}
            {t.id === 'gemini' && <g transform="translate(-20 -20) scale(0.8333)" dangerouslySetInnerHTML={{ __html: GEMINI_SVG_INNER }} />}
            {t.id === 'claude' && <g transform="translate(-20 -20) scale(0.8333)" dangerouslySetInnerHTML={{ __html: CLAUDE_SVG_INNER }} />}
          </g>
        </g>
      ))}

      {/* 动效层 */}
      {animate && (
        <>
          <GlowTrail path={PATH_IN} from={0.2} to={1.0} color="#07C160" />
          <MovingDot path={PATH_IN} from={0.2} to={1.0} color="#07C160" />
          {TARGETS.map((t, i) => (
            <React.Fragment key={t.id}>
              <GlowTrail path={outPaths[i]} from={departs[i]} to={departs[i] + 0.8} color={t.color === 'currentColor' ? token.colorText : t.color} />
              <MovingDot path={outPaths[i]} from={departs[i]} to={departs[i] + 0.8} color={t.color === 'currentColor' ? token.colorText : t.color} r={4} />
            </React.Fragment>
          ))}
        </>
      )}

      {/* 标注 */}
      <text x={WECHAT.x} y={WECHAT.y + 44} textAnchor="middle" fontSize={11} fill={token.colorTextTertiary}>
        微信
      </text>
      <text x={DIHUA.x} y={DIHUA.y + 52} textAnchor="middle" fontSize={11} fill={token.colorTextTertiary}>
        递话
      </text>
      {TARGETS.map((t) => (
        <text key={t.id} x={t.x + 30} y={t.y + 4} fontSize={11} fill={token.colorTextTertiary}>
          {t.id === 'openai' ? 'ChatGPT' : t.id === 'gemini' ? 'Gemini' : 'Claude'}
        </text>
      ))}
    </svg>
  )
}
