import React from 'react'
import { theme } from 'antd'
import type { ShareEntryState } from '@shared/types'
import iconUrl from '../assets/icon.png'
import { useMotion } from '../hooks/useReducedMotion'

/**
 * 入口页的示意图：微信「转发到其他应用」菜单 → 「选择电脑中的应用」子菜单 → 「递话」。
 * 4s 循环：
 *   0.3–0.9s  鼠标移到「选择电脑中的应用」，该行高亮
 *   1.0s      子菜单从右侧滑出
 *   1.3–1.9s  鼠标移到「递话」
 *   2.0s      「递话」行高亮，画出对勾，扩一圈涟漪
 *   3.4–4s    整体淡出，回到起点
 * 关闭状态：子菜单照样弹出，但「递话」保持灰色、没有对勾；未登记：静态虚线框。
 */
const CYCLE = 4
const dur = `${CYCLE}s`
const kt = (...secs: number[]): string => secs.map((s) => Math.min(1, Math.max(0, s / CYCLE))).join(';')

export default function EntryIllustration({ state }: { state: ShareEntryState | null }): React.JSX.Element {
  const { token } = theme.useToken()
  const motion = useMotion() && state !== 'unregistered'
  const panel = token.colorBgElevated
  const border = token.colorBorderSecondary
  const text = token.colorText
  const muted = token.colorTextTertiary
  const enabled = state === 'enabled'
  const unregistered = state === 'unregistered'

  const Row = ({ y, label, dot, panelX, dim }: { y: number; label: string; dot: string; panelX: number; dim?: boolean }): React.JSX.Element => (
    <g opacity={dim ? 0.45 : 1}>
      <circle cx={panelX + 18} cy={y} r={6} fill={dot} />
      <text x={panelX + 32} y={y + 4} fontSize={11} fill={text}>
        {label}
      </text>
    </g>
  )

  return (
    <svg viewBox="0 0 300 190" width="100%" style={{ maxWidth: 236, height: 'auto', display: 'block' }} role="img" aria-label="微信转发菜单里的递话入口示意">
      <defs>
        <filter id="entry-shadow" x="-10%" y="-10%" width="120%" height="130%">
          <feDropShadow dx="0" dy="6" stdDeviation="8" floodColor="#000" floodOpacity={token.colorBgContainer === '#ffffff' ? 0.1 : 0.4} />
        </filter>
      </defs>

      {/* 一级菜单：转发到其他应用 */}
      <g filter="url(#entry-shadow)">
        <rect x={12} y={18} width={150} height={104} rx={10} fill={panel} stroke={border} />
      </g>
      <text x={26} y={40} fontSize={10.5} fill={muted}>
        转发到其他应用
      </text>
      <line x1={12} y1={50} x2={162} y2={50} stroke={border} />
      <Row y={68} label="企业微信" dot="#2B7BE9" panelX={12} />
      {/* 「选择电脑中的应用」：鼠标到达后高亮 */}
      <rect x={18} y={84} width={138} height={26} rx={6} fill={token.colorFillTertiary} opacity={motion ? 0 : 1}>
        {motion && <animate attributeName="opacity" values="0;0;1;1;0;0" keyTimes={kt(0, 0.8, 0.95, 3.4, 3.8, 4)} dur={dur} repeatCount="indefinite" />}
      </rect>
      <circle cx={30} cy={97} r={6} fill={muted} />
      <text x={44} y={101} fontSize={11} fill={text}>
        选择电脑中的应用
      </text>
      <text x={146} y={101} fontSize={11} fill={muted}>
        ›
      </text>

      {/* 子菜单：从右侧滑出 */}
      <g opacity={motion ? 0 : 1}>
        {motion && (
          <>
            <animate attributeName="opacity" values="0;0;1;1;0;0" keyTimes={kt(0, 1.0, 1.25, 3.4, 3.8, 4)} dur={dur} repeatCount="indefinite" />
            <animateTransform
              attributeName="transform"
              type="translate"
              values="10 0;10 0;0 0;0 0;10 0;10 0"
              keyTimes={kt(0, 1.0, 1.25, 3.4, 3.8, 4)}
              dur={dur}
              repeatCount="indefinite"
              calcMode="spline"
              keySplines="0 0 1 1;0.2 0.8 0.2 1;0 0 1 1;0.4 0 0.6 1;0 0 1 1"
            />
          </>
        )}
        <path d="M 156 97 C 168 97, 168 97, 178 97" fill="none" stroke={border} strokeDasharray="3 3" />
        <g filter="url(#entry-shadow)">
          <rect x={140} y={56} width={148} height={122} rx={10} fill={panel} stroke={border} />
        </g>
        <Row y={76} label="AirDrop" dot="#3B82F6" panelX={140} dim />
        <Row y={100} label="备忘录" dot="#F5B301" panelX={140} dim />

        {/* 递话那一行 */}
        {unregistered ? (
          <g>
            <rect x={146} y={112} width={136} height={26} rx={6} fill="none" stroke={token.colorWarning} strokeDasharray="4 3" />
            <text x={158} y={129} fontSize={11} fill={token.colorWarning}>
              尚未登记「递话」
            </text>
          </g>
        ) : (
          <g opacity={enabled ? 1 : 0.4}>
            {/* 高亮底 */}
            <rect x={146} y={112} width={136} height={26} rx={6} fill={enabled ? token.colorPrimaryBg : token.colorFillTertiary} opacity={motion ? 0 : 1}>
              {motion && <animate attributeName="opacity" values="0;0;1;1;0;0" keyTimes={kt(0, 1.95, 2.1, 3.4, 3.8, 4)} dur={dur} repeatCount="indefinite" />}
            </rect>
            {/* 涟漪 */}
            {motion && enabled && (
              <rect x={146} y={112} width={136} height={26} rx={6} fill="none" stroke={token.colorPrimary} strokeWidth={1.5} opacity={0}>
                <animate attributeName="opacity" values="0;0;0.7;0;0" keyTimes={kt(0, 2.0, 2.15, 2.7, 4)} dur={dur} repeatCount="indefinite" />
                <animateTransform attributeName="transform" type="scale" additive="sum" values="1;1;1.06;1.06" keyTimes={kt(0, 2.0, 2.7, 4)} dur={dur} repeatCount="indefinite" />
              </rect>
            )}
            <image href={iconUrl} x={150} y={116} width={18} height={18} />
            <text x={174} y={129} fontSize={11} fontWeight={600} fill={enabled ? token.colorPrimary : text}>
              递话
            </text>
            {/* 对勾：用 dashoffset 画出来 */}
            {enabled && (
              <path
                d="M 262 123 l 4 4 l 8 -8"
                fill="none"
                stroke={token.colorPrimary}
                strokeWidth={2}
                strokeLinecap="round"
                strokeLinejoin="round"
                pathLength={1}
                strokeDasharray={1}
                strokeDashoffset={motion ? 1 : 0}
              >
                {motion && <animate attributeName="stroke-dashoffset" values="1;1;0;0;1;1" keyTimes={kt(0, 2.05, 2.35, 3.4, 3.8, 4)} dur={dur} repeatCount="indefinite" />}
              </path>
            )}
          </g>
        )}
        <Row y={154} label="无边记" dot="#8B5CF6" panelX={140} dim />
      </g>

      {/* 鼠标指针：先到「选择电脑中的应用」，再到「递话」 */}
      {motion ? (
        <g opacity={0}>
          <animate attributeName="opacity" values="0;0;1;1;0;0" keyTimes={kt(0, 0.2, 0.35, 3.4, 3.8, 4)} dur={dur} repeatCount="indefinite" />
          <g>
            <animateTransform
              attributeName="transform"
              type="translate"
              values="70 150;70 150;110 98;110 98;232 128;232 128"
              keyTimes={kt(0, 0.3, 0.9, 1.3, 1.9, 4)}
              dur={dur}
              repeatCount="indefinite"
              calcMode="spline"
              keySplines="0 0 1 1;0.3 0 0.2 1;0 0 1 1;0.3 0 0.2 1;0 0 1 1"
            />
            <path d="M0 0 L0 13 L3.5 10 L6 15 L8 14 L5.5 9 L10 9 Z" fill={text} stroke={panel} strokeWidth={1} />
          </g>
        </g>
      ) : (
        enabled && (
          <g transform="translate(232 128)">
            <path d="M0 0 L0 13 L3.5 10 L6 15 L8 14 L5.5 9 L10 9 Z" fill={text} stroke={panel} strokeWidth={1} />
          </g>
        )
      )}
    </svg>
  )
}
