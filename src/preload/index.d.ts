import type { DihuaApi } from './index'

declare global {
  interface Window {
    dihua: DihuaApi
  }
}

export {}
