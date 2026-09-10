/* 在 Electron 主进程里用 electron-log；在纯 Node（vitest）里退化为 console，便于单测 */
type Logger = {
  info: (...args: unknown[]) => void
  warn: (...args: unknown[]) => void
  error: (...args: unknown[]) => void
  debug: (...args: unknown[]) => void
  transports: { file: { getFile: () => { path: string } } }
}

function createLogger(): Logger {
  if (process.versions.electron && process.type === 'browser') {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const log = require('electron-log/main') as typeof import('electron-log/main')
    log.initialize()
    log.transports.file.level = 'info'
    log.transports.file.maxSize = 2 * 1024 * 1024
    log.transports.console.level = process.env.NODE_ENV === 'development' ? 'debug' : 'info'
    return log as unknown as Logger
  }
  return {
    info: (...a) => console.log('[info]', ...a),
    warn: (...a) => console.warn('[warn]', ...a),
    error: (...a) => console.error('[error]', ...a),
    debug: (...a) => console.debug('[debug]', ...a),
    transports: { file: { getFile: () => ({ path: '' }) } },
  }
}

const log = createLogger()
export default log
