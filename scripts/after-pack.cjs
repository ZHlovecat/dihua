// electron-builder afterPack 钩子：没有 Developer ID 时它会跳过签名，而 Apple Silicon 上未签名的 app 打不开，
// 所以在这里做 ad-hoc 签名。顺序：整体 deep 签名 → 给每个 Share Extension 单独签沙盒 entitlements → 重新封外层。
// 钥匙串里有证书（CSC_LINK / CSC_NAME）时交给 electron-builder 自己签，这里什么都不做。
const { execFileSync } = require('node:child_process')
const { existsSync, readdirSync } = require('node:fs')
const path = require('node:path')

module.exports = async function afterPack(context) {
  if (context.electronPlatformName !== 'darwin') return
  if (process.env.CSC_LINK || process.env.CSC_NAME) return
  const root = context.packager.projectDir
  const appPath = path.join(context.appOutDir, `${context.packager.appInfo.productFilename}.app`)
  const appEntitlements = path.join(root, 'build', 'entitlements.mac.plist')
  const appexEntitlements = path.join(root, 'native', 'share-extension', 'entitlements.plist')
  const codesign = (args) => execFileSync('codesign', args, { stdio: 'inherit' })

  codesign(['--force', '--deep', '--sign', '-', '--entitlements', appEntitlements, appPath])
  const plugins = path.join(appPath, 'Contents', 'PlugIns')
  if (existsSync(plugins)) {
    for (const name of readdirSync(plugins)) {
      if (name.endsWith('.appex')) codesign(['--force', '--sign', '-', '--entitlements', appexEntitlements, path.join(plugins, name)])
    }
  }
  codesign(['--force', '--sign', '-', '--entitlements', appEntitlements, appPath])
  codesign(['--verify', '--deep', '--strict', appPath])
  console.log(`ad-hoc signed ${appPath}`)
}
