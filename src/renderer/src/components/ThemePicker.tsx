import React, { useId } from 'react'
import { Flex, Typography, theme } from 'antd'
import type { ThemeMode } from '@shared/types'
import { useMotion } from '../hooks/useReducedMotion'

/**
 * 外观选项的 SVG 预览卡，三张共用 8s 循环：
 *  - 白天：内容行逐条打出 → 一道暖光从左扫到右 → 太阳光芒持续转动，输入框光标闪烁
 *  - 黑夜：月亮柔光呼吸，群星错落闪烁，每轮划过一颗流星
 *  - 跟随系统：斜切分界线从左扫到右把窗口变成白天，停留后退回黑夜；徽标里太阳、月亮随之升降
 * 减弱动效时只画最终状态。
 */
const CYCLE = 8
const dur = `${CYCLE}s`
const kt = (...secs: number[]): string => secs.map((s) => Math.min(1, Math.max(0, s / CYCLE))).join(';')

const LIGHT = { bg: '#ffffff', side: '#f5f5f5', line: '#e5e5e5', text: '#8c8c8c', accent: '#1677ff' }
const DARK = { bg: '#141414', side: '#1f1f1f', line: '#303030', text: '#595959', accent: '#4096ff' }
const LINES = [
  { x: 44, y: 12, w: 40, h: 6, strong: true },
  { x: 44, y: 26, w: 64, h: 4 },
  { x: 44, y: 36, w: 56, h: 4 },
]

/** 微型窗口；typeIn 为 true 时内容行在周期开头逐条「打出来」 */
function Window({ p, motion, typeIn }: { p: typeof LIGHT; motion: boolean; typeIn?: boolean }): React.JSX.Element {
  return (
    <g>
      <rect x={0} y={0} width={120} height={80} rx={8} fill={p.bg} />
      <rect x={0} y={0} width={34} height={80} fill={p.side} />
      <rect x={8} y={12} width={18} height={4} rx={2} fill={p.accent} opacity={0.9} />
      <rect x={8} y={22} width={18} height={4} rx={2} fill={p.line} />
      <rect x={8} y={32} width={18} height={4} rx={2} fill={p.line} />
      {LINES.map((l, i) => (
        <rect key={i} x={l.x} y={l.y} width={l.w} height={l.h} rx={l.h / 2} fill={l.strong ? p.text : p.line} opacity={l.strong ? 0.8 : 1}>
          {motion && typeIn && (
            <animate attributeName="width" values={`0;0;${l.w};${l.w};0`} keyTimes={kt(0, 0.3 + i * 0.35, 0.9 + i * 0.35, 7.4, 7.8)} dur={dur} repeatCount="indefinite" />
          )}
        </rect>
      ))}
      <rect x={44} y={50} width={64} height={18} rx={5} fill={p.side} stroke={p.line} />
    </g>
  )
}

/** 太阳的外径与月亮（弯月 path 约 16、柔光 r=9）一致：光芒顶到 8.5，核心 r=4.2 */
function Sun({ motion, color }: { motion: boolean; color: string }): React.JSX.Element {
  return (
    <g>
      <g>
        {motion && <animateTransform attributeName="transform" type="rotate" from="0" to="360" dur="24s" repeatCount="indefinite" />}
        {Array.from({ length: 8 }, (_, i) => (
          <line key={i} x1={0} y1={-6.5} x2={0} y2={-8.5} stroke={color} strokeWidth={1.5} strokeLinecap="round" transform={`rotate(${i * 45})`} />
        ))}
      </g>
      <circle r={4.2} fill={color} />
    </g>
  )
}

function Moon({ motion, color }: { motion: boolean; color: string }): React.JSX.Element {
  return (
    <g>
      <circle r={9} fill={color} opacity={0.18}>
        {motion && <animate attributeName="r" values="9;12;9" dur="3.6s" repeatCount="indefinite" />}
        {motion && <animate attributeName="opacity" values="0.18;0.05;0.18" dur="3.6s" repeatCount="indefinite" />}
      </circle>
      <path d="M 2 -8 A 8 8 0 1 0 8 4 A 6.5 6.5 0 1 1 2 -8 Z" fill={color} />
    </g>
  )
}

function DayScene({ motion, uid }: { motion: boolean; uid: string }): React.JSX.Element {
  return (
    <>
      <defs>
        <linearGradient id={`sweep-${uid}`} x1="0" x2="1" y1="0" y2="0">
          <stop offset="0" stopColor="#ffd666" stopOpacity={0} />
          <stop offset="0.5" stopColor="#ffd666" stopOpacity={0.35} />
          <stop offset="1" stopColor="#ffd666" stopOpacity={0} />
        </linearGradient>
        <clipPath id={`win-${uid}`}>
          <rect x={0} y={0} width={120} height={80} rx={8} />
        </clipPath>
      </defs>
      <Window p={LIGHT} motion={motion} typeIn />
      {/* 输入框光标 */}
      {motion && (
        <rect x={50} y={55} width={1.5} height={8} fill={LIGHT.text}>
          <animate attributeName="opacity" values="1;0;1" dur="1.1s" repeatCount="indefinite" />
        </rect>
      )}
      {/* 暖光扫过窗口 */}
      {motion && (
        <g clipPath={`url(#win-${uid})`}>
          <rect x={-60} y={-10} width={60} height={100} fill={`url(#sweep-${uid})`} transform="skewX(-18)">
            <animate attributeName="x" values="-60;-60;150;150" keyTimes={kt(0, 1.6, 3.2, 8)} dur={dur} repeatCount="indefinite" />
          </rect>
        </g>
      )}
    </>
  )
}

function NightScene({ motion, uid }: { motion: boolean; uid: string }): React.JSX.Element {
  const stars = [
    { x: 52, y: 60, r: 1.1, d: 0 },
    { x: 66, y: 66, r: 0.8, d: 0.7 },
    { x: 96, y: 40, r: 1.2, d: 1.3 },
    { x: 108, y: 20, r: 0.9, d: 2.1 },
    { x: 84, y: 62, r: 0.7, d: 2.8 },
    { x: 60, y: 44, r: 0.8, d: 3.4 },
  ]
  return (
    <>
      <defs>
        <clipPath id={`win-${uid}`}>
          <rect x={0} y={0} width={120} height={80} rx={8} />
        </clipPath>
      </defs>
      <Window p={DARK} motion={motion} />
      <g clipPath={`url(#win-${uid})`}>
        {stars.map((s, i) => (
          <circle key={i} cx={s.x} cy={s.y} r={s.r} fill="#adc6ff" opacity={motion ? 0.25 : 0.9}>
            {motion && <animate attributeName="opacity" values="0.15;0.95;0.15" dur="2.6s" begin={`${s.d}s`} repeatCount="indefinite" />}
          </circle>
        ))}
        {/* 流星：每轮一次，从右上划向左下 */}
        {motion && (
          <line x1={0} y1={0} x2={-16} y2={10} stroke="#adc6ff" strokeWidth={1.2} strokeLinecap="round" opacity={0}>
            <animate attributeName="opacity" values="0;0;0.9;0;0" keyTimes={kt(0, 4.6, 4.75, 5.3, 8)} dur={dur} repeatCount="indefinite" />
            <animateTransform attributeName="transform" type="translate" values="118 8;118 8;62 44;62 44" keyTimes={kt(0, 4.6, 5.3, 8)} dur={dur} repeatCount="indefinite" />
          </line>
        )}
      </g>
    </>
  )
}

function SystemScene({ motion, uid }: { motion: boolean; uid: string }): React.JSX.Element {
  // 光亮区域的多边形：右边界从窗口左侧扫到右侧（白天），停留后退回（黑夜）
  const night = '0,0 0,0 -28,80 0,80'
  const day = '0,0 148,0 120,80 0,80'
  const points = `${night};${night};${day};${day};${night};${night}`
  const times = kt(0, 0.8, 3.0, 4.6, 6.8, 8)
  return (
    <>
      <defs>
        <clipPath id={`split-${uid}`}>
          <polygon points={motion ? night : '0,0 74,0 46,80 0,80'}>{motion && <animate attributeName="points" values={points} keyTimes={times} dur={dur} repeatCount="indefinite" calcMode="spline" keySplines="0 0 1 1;0.4 0 0.2 1;0 0 1 1;0.4 0 0.2 1;0 0 1 1" />}</polygon>
        </clipPath>
        <clipPath id={`win-${uid}`}>
          <rect x={0} y={0} width={120} height={80} rx={8} />
        </clipPath>
      </defs>
      <Window p={DARK} motion={motion} />
      <g clipPath={`url(#split-${uid})`}>
        <Window p={LIGHT} motion={motion} />
      </g>
      {/* 跟着分界线走的一道高光 */}
      <g clipPath={`url(#win-${uid})`}>
        <line x1={0} y1={0} x2={-28} y2={80} stroke="#1677ff" strokeWidth={1.5} opacity={0.75}>
          {motion && (
            <>
              <animate attributeName="x1" values="0;0;148;148;0;0" keyTimes={times} dur={dur} repeatCount="indefinite" calcMode="spline" keySplines="0 0 1 1;0.4 0 0.2 1;0 0 1 1;0.4 0 0.2 1;0 0 1 1" />
              <animate attributeName="x2" values="-28;-28;120;120;-28;-28" keyTimes={times} dur={dur} repeatCount="indefinite" calcMode="spline" keySplines="0 0 1 1;0.4 0 0.2 1;0 0 1 1;0.4 0 0.2 1;0 0 1 1" />
            </>
          )}
        </line>
      </g>
    </>
  )
}

/** 徽标：白天太阳、黑夜月亮、跟随系统时太阳与月亮随昼夜升降交替 */
function Badge({ mode, motion, badgeBg, border }: { mode: ThemeMode; motion: boolean; badgeBg: string; border: string }): React.JSX.Element {
  const sunTimes = kt(0, 0.8, 3.0, 4.6, 6.8, 8)
  return (
    <g transform="translate(100 60)">
      <circle r={13} fill={badgeBg} stroke={border} />
      <clipPath id="badge-clip">
        <circle r={12.5} />
      </clipPath>
      <g clipPath="url(#badge-clip)">
        {mode === 'light' && <Sun motion={motion} color="#faad14" />}
        {mode === 'dark' && <Moon motion={motion} color="#597ef7" />}
        {mode === 'system' && (
          <>
            <g transform={motion ? 'translate(0 22)' : 'translate(-6 0) scale(0.8)'}>
              {motion && (
                <animateTransform attributeName="transform" type="translate" values="0 22;0 22;0 0;0 0;0 22;0 22" keyTimes={sunTimes} dur={dur} repeatCount="indefinite" calcMode="spline" keySplines="0 0 1 1;0.4 0 0.2 1;0 0 1 1;0.4 0 0.2 1;0 0 1 1" />
              )}
              <Sun motion={motion} color="#faad14" />
            </g>
            <g transform={motion ? 'translate(0 0)' : 'translate(6 0) scale(0.8)'}>
              {motion && (
                <animateTransform attributeName="transform" type="translate" values="0 0;0 0;0 -22;0 -22;0 0;0 0" keyTimes={sunTimes} dur={dur} repeatCount="indefinite" calcMode="spline" keySplines="0 0 1 1;0.4 0 0.2 1;0 0 1 1;0.4 0 0.2 1;0 0 1 1" />
              )}
              <Moon motion={motion} color="#597ef7" />
            </g>
          </>
        )}
      </g>
    </g>
  )
}

function Preview({ mode, motion, selected }: { mode: ThemeMode; motion: boolean; selected: boolean }): React.JSX.Element {
  const { token } = theme.useToken()
  const uid = useId().replace(/:/g, '')
  return (
    <svg viewBox="0 0 120 80" width="100%" style={{ display: 'block', borderRadius: 8 }} aria-hidden="true">
      {mode === 'light' && <DayScene motion={motion} uid={uid} />}
      {mode === 'dark' && <NightScene motion={motion} uid={uid} />}
      {mode === 'system' && <SystemScene motion={motion} uid={uid} />}
      <Badge mode={mode} motion={motion} badgeBg={token.colorBgElevated} border={token.colorBorderSecondary} />
      {selected && (
        <g transform="translate(10 10)">
          <circle r={7} fill={token.colorPrimary} />
          <path d="M -3 0 l 2 2 l 4 -4" fill="none" stroke="#fff" strokeWidth={1.6} strokeLinecap="round" strokeLinejoin="round" />
        </g>
      )}
    </svg>
  )
}

const OPTIONS: Array<{ mode: ThemeMode; label: string; detail: string }> = [
  { mode: 'system', label: '跟随系统', detail: '和 macOS 外观一致' },
  { mode: 'light', label: '白天', detail: '始终使用浅色' },
  { mode: 'dark', label: '黑夜', detail: '始终使用深色' },
]

export default function ThemePicker({ value, onChange }: { value: ThemeMode; onChange: (mode: ThemeMode) => void }): React.JSX.Element {
  const { token } = theme.useToken()
  const motion = useMotion()
  return (
    <Flex gap={12} wrap role="radiogroup" aria-label="外观">
      {OPTIONS.map((o) => {
        const selected = o.mode === value
        return (
          <div
            key={o.mode}
            role="radio"
            aria-checked={selected}
            tabIndex={0}
            className="theme-option"
            onClick={() => onChange(o.mode)}
            onKeyDown={(e) => {
              if (e.key === ' ' || e.key === 'Enter') onChange(o.mode)
            }}
            style={{
              flex: '1 1 140px',
              minWidth: 0,
              padding: 6,
              borderRadius: token.borderRadiusLG,
              background: token.colorBgContainer,
              boxShadow: selected ? `0 0 0 2px ${token.colorPrimary}` : `inset 0 0 0 1px ${token.colorBorderSecondary}`,
              cursor: 'default',
            }}
          >
            <Preview mode={o.mode} motion={motion} selected={selected} />
            <div style={{ padding: '8px 6px 2px', minWidth: 0 }}>
              <Typography.Text strong style={{ display: 'block', fontSize: 13, color: selected ? token.colorPrimary : undefined }}>
                {o.label}
              </Typography.Text>
              <Typography.Text type="secondary" style={{ fontSize: 11 }}>
                {o.detail}
              </Typography.Text>
            </div>
          </div>
        )
      })}
    </Flex>
  )
}
