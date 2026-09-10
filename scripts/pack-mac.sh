#!/bin/bash
# 打包递话（含 Share Extension），ad-hoc 签名；加 --install 则装进 /Applications 并登记共享扩展。
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

bash scripts/build-share-extension.sh
pnpm exec electron-vite build
pnpm exec electron-builder --mac dir --arm64 >/dev/null

APP="$ROOT/dist/mac-arm64/Dihua.app"
test -d "$APP/Contents/PlugIns/DihuaShare.appex" || { echo "appex 未被打进 PlugIns，请检查 electron-builder.yml 的 extraFiles"; exit 1; }

# ad-hoc 签名已由 electron-builder 的 afterPack 钩子（scripts/after-pack.cjs）完成，这里只复核
codesign --verify --deep --strict "$APP"
echo "packed $APP"

if [ "${1:-}" = "--install" ]; then
  osascript -e 'quit app id "app.dihua.desktop"' >/dev/null 2>&1 || true
  sleep 1
  LSR=/System/Library/Frameworks/CoreServices.framework/Versions/A/Frameworks/LaunchServices.framework/Versions/A/Support/lsregister
  rm -rf "/Applications/Dihua.app"
  cp -R "$APP" /Applications/
  "$LSR" -u "$APP" >/dev/null 2>&1 || true
  rm -rf "$ROOT/dist/mac-arm64"
  "$LSR" -f "/Applications/Dihua.app" >/dev/null 2>&1 || true
  pluginkit -a "/Applications/Dihua.app/Contents/PlugIns/DihuaShare.appex" 2>/dev/null || true
  pluginkit -e use -i app.dihua.desktop.share 2>/dev/null || true
  echo "installed /Applications/Dihua.app"
  pluginkit -m -i app.dihua.desktop.share -v || true
fi
