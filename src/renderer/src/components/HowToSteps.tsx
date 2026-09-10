import React from 'react'
import { Flex, Typography, theme } from 'antd'
import iconUrl from '../assets/icon.png'
import { useMotion } from '../hooks/useReducedMotion'

/**
 * 入口页「怎么用」的三张步骤卡，每张一段 SMIL 动画，共用 4s 周期：
 *   1. 拨开开关 → 菜单里冒出「递话」
 *   2. 聊天列表依次勾选 → 纸飞机飞向「递话」
 *   3. 输入框里带着 transcript.md 打字 → 回车 → 冒星
 * 系统「减弱动态效果」时只画最终状态。
 */
const CYCLE = 4
const dur = `${CYCLE}s`
const kt = (...secs: number[]): string => secs.map((s) => Math.min(1, Math.max(0, s / CYCLE))).join(';')


type Tokens = ReturnType<typeof theme.useToken>['token']

/* ---------- 1. 拨开开关 ---------- */
function ToggleScene({ t, motion }: { t: Tokens; motion: boolean }): React.JSX.Element {
  const off = t.colorTextQuaternary
  return (
    <svg viewBox="0 0 160 100" width="100%" style={{ display: 'block' }}>
      {/* 开关 */}
      <rect x={52} y={22} width={56} height={28} rx={14} fill={motion ? off : t.colorPrimary}>
        {motion && <animate attributeName="fill" values={`${off};${off};${t.colorPrimary};${t.colorPrimary};${off}`} keyTimes={kt(0, 0.6, 0.85, 3.6, 4)} dur={dur} repeatCount="indefinite" />}
      </rect>
      <circle cy={36} r={11} fill="#fff" cx={motion ? 66 : 94} style={{ filter: 'drop-shadow(0 1px 2px rgba(0,0,0,.25))' }}>
        {motion && <animate attributeName="cx" values="66;66;94;94;66" keyTimes={kt(0, 0.6, 0.85, 3.6, 4)} dur={dur} repeatCount="indefinite" calcMode="spline" keySplines="0 0 1 1;0.2 0.8 0.2 1;0 0 1 1;0.4 0 0.6 1" />}
      </circle>
      {/* 菜单里冒出来的那一行 */}
      <g opacity={motion ? 0 : 1}>
        {motion && <animate attributeName="opacity" values="0;0;1;1;0" keyTimes={kt(0, 1.1, 1.4, 3.6, 4)} dur={dur} repeatCount="indefinite" />}
        <rect x={30} y={64} width={100} height={22} rx={6} fill={t.colorPrimaryBg} />
        <image href={iconUrl} x={38} y={68} width={14} height={14} />
        <text x={58} y={79} fontSize={11} fontWeight={600} fill={t.colorPrimary}>
          递话
        </text>
        <path d="M 112 75 l 4 4 l 7 -7" fill="none" stroke={t.colorPrimary} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
      </g>
      {/* 小手指点一下 */}
      {motion && (
        <g opacity={0}>
          <animate attributeName="opacity" values="0;0;1;1;0;0" keyTimes={kt(0, 0.25, 0.4, 0.9, 1.1, 4)} dur={dur} repeatCount="indefinite" />
          <g transform="translate(70 40)">
            <animateTransform attributeName="transform" type="translate" values="70 40;70 40;96 40;96 40;70 40" keyTimes={kt(0, 0.6, 0.85, 3.6, 4)} dur={dur} repeatCount="indefinite" />
            <path d="M0 0 L0 13 L3.5 10 L6 15 L8 14 L5.5 9 L10 9 Z" fill={t.colorText} stroke={t.colorBgContainer} strokeWidth={1} />
          </g>
        </g>
      )}
    </svg>
  )
}

/* ---------- 2. 多选并转发 ---------- */
function SelectScene({ t, motion }: { t: Tokens; motion: boolean }): React.JSX.Element {
  const rows = [16, 40, 64]
  const ticks = [0.3, 0.7, 1.1]
  return (
    <svg viewBox="0 0 160 100" width="100%" style={{ display: 'block' }}>
      {rows.map((y, i) => (
        <g key={y}>
          {/* 勾选框 */}
          <rect x={12} y={y} width={12} height={12} rx={6} fill={motion ? t.colorBgContainer : t.colorPrimary} stroke={t.colorBorder}>
            {/* SMIL 不能在 none 和颜色之间插值（会退成黑色），所以未勾选态用容器底色 */}
            {motion && (
              <animate
                attributeName="fill"
                values={`${t.colorBgContainer};${t.colorBgContainer};${t.colorPrimary};${t.colorPrimary};${t.colorBgContainer}`}
                keyTimes={kt(0, ticks[i], ticks[i] + 0.15, 3.6, 4)}
                dur={dur}
                repeatCount="indefinite"
              />
            )}
          </rect>
          <path d={`M ${14.5} ${y + 6} l 2.5 2.5 l 5 -5`} fill="none" stroke="#fff" strokeWidth={1.6} strokeLinecap="round" strokeLinejoin="round" opacity={motion ? 0 : 1}>
            {motion && <animate attributeName="opacity" values="0;0;1;1;0" keyTimes={kt(0, ticks[i] + 0.05, ticks[i] + 0.2, 3.6, 4)} dur={dur} repeatCount="indefinite" />}
          </path>
          {/* 气泡 */}
          <rect x={32} y={y - 2} width={i === 1 ? 44 : 64} height={16} rx={8} fill={i === 1 ? '#95EC69' : t.colorFillSecondary} opacity={i === 1 ? 0.9 : 1} />
        </g>
      ))}
      {/* 纸飞机：勾完后从列表飞向右侧的「递话」 */}
      <g opacity={motion ? 0 : 1}>
        {motion && <animate attributeName="opacity" values="0;0;1;1;0;0" keyTimes={kt(0, 1.5, 1.6, 2.3, 2.45, 4)} dur={dur} repeatCount="indefinite" />}
        <g transform="translate(150 50)">
          {motion && <animateMotion dur={dur} repeatCount="indefinite" path="M 88 46 C 110 30, 125 30, 150 50" keyTimes={kt(0, 1.5, 2.3, 4)} keyPoints="0;0;1;1" calcMode="linear" />}
          <path d="M-9 -6 L9 0 L-9 6 L-5 0 Z" fill={t.colorPrimary} />
        </g>
      </g>
      {/* 递话 */}
      <g transform="translate(118 62)">
        <rect x={0} y={0} width={34} height={34} rx={8} fill={t.colorBgElevated} stroke={t.colorBorderSecondary}>
          {motion && <animate attributeName="stroke" values={`${t.colorBorderSecondary};${t.colorBorderSecondary};${t.colorPrimary};${t.colorPrimary};${t.colorBorderSecondary}`} keyTimes={kt(0, 2.3, 2.45, 3.6, 4)} dur={dur} repeatCount="indefinite" />}
        </rect>
        <image href={iconUrl} x={5} y={5} width={24} height={24} />
        {motion && (
          <circle cx={17} cy={17} r={20} fill="none" stroke={t.colorPrimary} strokeWidth={1.5} opacity={0}>
            <animate attributeName="r" values="20;20;30;30" keyTimes={kt(0, 2.3, 2.9, 4)} dur={dur} repeatCount="indefinite" />
            <animate attributeName="opacity" values="0;0;0.6;0;0" keyTimes={kt(0, 2.3, 2.5, 2.9, 4)} dur={dur} repeatCount="indefinite" />
          </circle>
        )}
      </g>
    </svg>
  )
}

/* ---------- 3. 在 AI 里说要求 ---------- */
function TypeScene({ t, motion }: { t: Tokens; motion: boolean }): React.JSX.Element {
  const typed = '帮我总结要点'
  return (
    <svg viewBox="0 0 160 100" width="100%" style={{ display: 'block' }}>
      <defs>
        <clipPath id="howto-type-clip">
          <rect x={22} y={52} width={motion ? 0 : 100} height={20}>
            {motion && <animate attributeName="width" values="0;0;78;78;0" keyTimes={kt(0, 1.0, 2.2, 3.6, 4)} dur={dur} repeatCount="indefinite" />}
          </rect>
        </clipPath>
      </defs>
      {/* 输入框 */}
      <rect x={14} y={24} width={132} height={52} rx={10} fill={t.colorBgElevated} stroke={t.colorBorder} />
      {/* 附件：transcript.md */}
      <g opacity={motion ? 0 : 1}>
        {motion && <animate attributeName="opacity" values="0;0;1;1;0" keyTimes={kt(0, 0.2, 0.5, 3.6, 4)} dur={dur} repeatCount="indefinite" />}
        <rect x={22} y={31} width={76} height={15} rx={4} fill={t.colorPrimaryBg} />
        <rect x={27} y={35} width={6} height={7} rx={1} fill={t.colorPrimary} />
        <text x={37} y={42} fontSize={8} fill={t.colorPrimary}>
          transcript.md
        </text>
      </g>
      {/* 打出来的字 */}
      <text x={22} y={66} fontSize={11} fill={t.colorText} clipPath="url(#howto-type-clip)">
        {typed}
      </text>
      {/* 光标 */}
      {motion && (
        <rect x={22} y={56} width={1.5} height={13} fill={t.colorText}>
          <animate attributeName="x" values="22;22;89;89;22" keyTimes={kt(0, 1.0, 2.2, 3.6, 4)} dur={dur} repeatCount="indefinite" />
          <animate attributeName="opacity" values="1;0;1;0;1;0;1;0" dur="1.2s" repeatCount="indefinite" />
        </rect>
      )}
      {/* 回车键 */}
      <g transform="translate(118 52)">
        <rect x={0} y={0} width={20} height={16} rx={4} fill={t.colorFillTertiary}>
          {motion && <animate attributeName="fill" values={`${t.colorFillTertiary};${t.colorFillTertiary};${t.colorPrimary};${t.colorFillTertiary};${t.colorFillTertiary}`} keyTimes={kt(0, 2.5, 2.65, 2.9, 4)} dur={dur} repeatCount="indefinite" />}
        </rect>
        <text x={10} y={12} fontSize={10} textAnchor="middle" fill={t.colorTextSecondary}>
          ⏎
        </text>
      </g>
      {/* 冒星 */}
      {[
        { x: 134, y: 14, s: 1, at: 2.9 },
        { x: 146, y: 24, s: 0.6, at: 3.05 },
        { x: 124, y: 26, s: 0.5, at: 3.2 },
      ].map((st, i) => (
        <g key={i} transform={`translate(${st.x} ${st.y}) scale(${st.s})`} opacity={motion ? 0 : 1}>
          {motion && <animate attributeName="opacity" values="0;0;1;1;0" keyTimes={kt(0, st.at, st.at + 0.15, 3.6, 4)} dur={dur} repeatCount="indefinite" />}
          <path d="M0 -7 C1 -2 2 -1 7 0 C2 1 1 2 0 7 C-1 2 -2 1 -7 0 C-2 -1 -1 -2 0 -7 Z" fill={t.colorPrimary} />
        </g>
      ))}
    </svg>
  )
}

const STEPS = [
  { title: '打开上面的入口', detail: '拨一下就生效，随时能再改。', Scene: ToggleScene },
  { title: '从微信转发', detail: '多选聊天记录 → 转发 → 转发到其他应用 → 选择电脑中的应用 → 递话。', Scene: SelectScene },
  { title: '在 AI 里说你的要求', detail: '递话会整理成 transcript.md，打开你选的 AI 并带上记录位置；要做什么，到那边直接说。', Scene: TypeScene },
]

export default function HowToSteps(): React.JSX.Element {
  const { token } = theme.useToken()
  const motion = useMotion()
  return (
    <Flex gap={12} wrap>
      {STEPS.map((s, i) => (
        <Flex key={s.title} vertical gap={10} style={{ flex: '1 1 150px', minWidth: 0 }}>
          <div
            style={{
              borderRadius: token.borderRadiusLG,
              background: `linear-gradient(160deg, ${token.colorFillQuaternary} 0%, ${token.colorFillSecondary} 100%)`,
              border: `1px solid ${token.colorBorderSecondary}`,
              padding: '10px 8px 6px',
            }}
          >
            <s.Scene t={token} motion={motion} />
          </div>
          <Flex gap={8} align="flex-start">
            <span
              style={{
                flex: '0 0 auto',
                width: 20,
                height: 20,
                borderRadius: '50%',
                background: token.colorPrimary,
                color: '#fff',
                fontSize: 11,
                fontWeight: 600,
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
                marginTop: 1,
              }}
            >
              {i + 1}
            </span>
            <div style={{ minWidth: 0 }}>
              <Typography.Text strong style={{ display: 'block' }}>
                {s.title}
              </Typography.Text>
              <Typography.Text type="secondary" style={{ fontSize: 12 }}>
                {s.detail}
              </Typography.Text>
            </div>
          </Flex>
        </Flex>
      ))}
    </Flex>
  )
}
