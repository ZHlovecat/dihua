import { useEffect, useState } from 'react'

/** 系统「减弱动态效果」开着时返回 false，各处 SVG 动画据此只画最终状态 */
export function useMotion(): boolean {
  const [on, setOn] = useState(true)
  useEffect(() => {
    const mq = window.matchMedia('(prefers-reduced-motion: reduce)')
    const apply = (): void => setOn(!mq.matches)
    apply()
    mq.addEventListener('change', apply)
    return () => mq.removeEventListener('change', apply)
  }, [])
  return on
}
