import React, { useId } from 'react'
import { Card, Space, theme } from 'antd'
import { useMotion } from '../hooks/useReducedMotion'

/**
 * 带 SVG 背景层的卡片：antd Card 之上铺一层不可交互的 SVG。
 *  - blobs：两团主色系的模糊色块在右上角缓慢漂移
 *  - dots：右上角一片渐隐的点阵
 * 颜色全部取 antd 令牌，深浅色自适应；减弱动效时色块静止。
 */
export default function SvgCard({
  title,
  icon,
  extra,
  decor = 'dots',
  bodyPadding,
  children,
}: {
  title: string
  icon?: React.ReactNode
  extra?: React.ReactNode
  decor?: 'blobs' | 'dots' | 'none'
  bodyPadding?: number | string
  children: React.ReactNode
}): React.JSX.Element {
  const { token } = theme.useToken()
  const motion = useMotion()
  const uid = useId().replace(/:/g, '')

  return (
    <Card
      size="small"
      title={
        <Space size={6}>
          {icon}
          <span>{title}</span>
        </Space>
      }
      extra={extra}
      style={{ position: 'relative', overflow: 'hidden' }}
      styles={{ body: { position: 'relative', padding: bodyPadding } }}
    >
      {decor !== 'none' && (
        <svg aria-hidden="true" style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', pointerEvents: 'none' }} preserveAspectRatio="xMaxYMin slice" viewBox="0 0 600 240">
          <defs>
            <pattern id={`dots-${uid}`} width={14} height={14} patternUnits="userSpaceOnUse">
              <circle cx={2} cy={2} r={1.4} fill={token.colorFillSecondary} />
            </pattern>
            <radialGradient id={`fade-${uid}`} cx="100%" cy="0%" r="70%">
              <stop offset="0%" stopColor="#fff" stopOpacity={1} />
              <stop offset="100%" stopColor="#fff" stopOpacity={0} />
            </radialGradient>
            <mask id={`mask-${uid}`}>
              <rect width={600} height={240} fill={`url(#fade-${uid})`} />
            </mask>
            <filter id={`blur-${uid}`} x="-50%" y="-50%" width="200%" height="200%">
              <feGaussianBlur stdDeviation={28} />
            </filter>
          </defs>
          <rect width={600} height={240} fill={`url(#dots-${uid})`} mask={`url(#mask-${uid})`} opacity={decor === 'blobs' ? 0.5 : 0.9} />
          {decor === 'blobs' && (
            <g filter={`url(#blur-${uid})`} opacity={0.9}>
              <circle cx={520} cy={30} r={70} fill={token.colorPrimaryBg}>
                {motion && <animateTransform attributeName="transform" type="translate" values="0 0;-30 24;0 0" dur="14s" repeatCount="indefinite" calcMode="spline" keySplines="0.4 0 0.6 1;0.4 0 0.6 1" />}
              </circle>
              <circle cx={590} cy={120} r={55} fill={token.colorInfoBg}>
                {motion && <animateTransform attributeName="transform" type="translate" values="0 0;-40 -20;0 0" dur="18s" repeatCount="indefinite" calcMode="spline" keySplines="0.4 0 0.6 1;0.4 0 0.6 1" />}
              </circle>
            </g>
          )}
        </svg>
      )}
      <div style={{ position: 'relative' }}>{children}</div>
    </Card>
  )
}
