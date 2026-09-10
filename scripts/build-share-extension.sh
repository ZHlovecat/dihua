#!/bin/bash
# 用 Command Line Tools 的 clang 编译递话的 Share Extension（不需要 Xcode）。
# 同一份二进制打成 4 个 appex：通用的「递话」，以及每个目标应用一个的「递给 ChatGPT / Claude / Gemini」
# （Info.plist 里带 DihuaTarget，主程序收到后直接递给该目标）。显示名要和 src/main/targets/*.ts 的 shareLabel 一致。
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
SRC="$ROOT/native/share-extension"
OUTDIR="$ROOT/build/share-extension"
TMP="$(mktemp -d)"
trap 'rm -rf "$TMP"' EXIT

clang -fobjc-arc -fapplication-extension -Wall -O2 \
  -mmacosx-version-min=13.0 -arch arm64 -arch x86_64 \
  -framework Cocoa -e _NSExtensionMain \
  -o "$TMP/DihuaShare" \
  "$SRC/DihuaShareViewController.m"

# SVG → icns：QuickLook 渲染成 1024 PNG，sips 缩出各档，iconutil 打包。任一步失败就不带图标（回退到主程序图标）。
make_icns() {
  local svg="$1" out="$2" ql="$TMP/ql-$RANDOM" set="$TMP/icon-$RANDOM.iconset" png
  mkdir -p "$ql" "$set"
  qlmanage -t -s 1024 -o "$ql" "$svg" >/dev/null 2>&1 || return 1
  png="$ql/$(basename "$svg").png"
  [ -f "$png" ] || return 1
  local size
  for size in 16 32 128 256 512; do
    sips -z "$size" "$size" "$png" --out "$set/icon_${size}x${size}.png" >/dev/null 2>&1 || return 1
    sips -z "$((size * 2))" "$((size * 2))" "$png" --out "$set/icon_${size}x${size}@2x.png" >/dev/null 2>&1 || return 1
  done
  iconutil -c icns "$set" -o "$out" >/dev/null 2>&1
}

# build_appex <目录名> <bundle id> <显示名> [target id] [图标 svg]
build_appex() {
  local name="$1" id="$2" display="$3" target="${4:-}" svg="${5:-}"
  local appex="$OUTDIR/$name.appex" plist
  rm -rf "$appex"
  mkdir -p "$appex/Contents/MacOS" "$appex/Contents/Resources"
  cp "$TMP/DihuaShare" "$appex/Contents/MacOS/DihuaShare"
  plist="$appex/Contents/Info.plist"
  cp "$SRC/Info.plist" "$plist"
  plutil -replace CFBundleIdentifier -string "$id" "$plist"
  plutil -replace CFBundleDisplayName -string "$display" "$plist"
  plutil -replace CFBundleName -string "$display" "$plist"
  if [ -n "$target" ]; then
    plutil -insert DihuaTarget -string "$target" "$plist"
  fi
  if [ -n "$svg" ] && make_icns "$svg" "$appex/Contents/Resources/Icon.icns"; then
    plutil -insert CFBundleIconFile -string "Icon" "$plist"
  else
    [ -n "$svg" ] && echo "warn: $name 图标生成失败，回退到主程序图标" >&2
  fi
  plutil -lint "$plist" >/dev/null
  echo "built $appex"
}

mkdir -p "$OUTDIR"
build_appex DihuaShare        app.dihua.desktop.share        "递话"
build_appex DihuaShare-codex  app.dihua.desktop.share.codex  "递给 ChatGPT" codex  "$SRC/icons/codex.svg"
build_appex DihuaShare-claude app.dihua.desktop.share.claude "递给 Claude"  claude "$SRC/icons/claude.svg"
build_appex DihuaShare-gemini app.dihua.desktop.share.gemini "递给 Gemini"  gemini "$SRC/icons/gemini.svg"
