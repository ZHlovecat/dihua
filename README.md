<p align="center">
  <img src="docs/assets/icon-256.png" width="120" alt="Dihua icon">
</p>

<h1 align="center">Dihua · 递话</h1>

<p align="center">
  <b>Hand your WeChat chats to any AI.</b><br>
  Select messages in WeChat for Mac, forward them to Dihua, and they land in ChatGPT, Claude or Gemini — files, images and a ready-made prompt included.
</p>

<p align="center">
  <b>English</b> · <a href="README.zh-CN.md">简体中文</a>
</p>

<p align="center">
  <a href="https://github.com/ZHlovecat/dihua/releases"><img src="https://img.shields.io/github/v/release/ZHlovecat/dihua?label=release" alt="Release"></a>
  <a href="https://github.com/ZHlovecat/dihua/actions/workflows/ci.yml"><img src="https://github.com/ZHlovecat/dihua/actions/workflows/ci.yml/badge.svg" alt="CI"></a>
  <img src="https://img.shields.io/badge/platform-macOS%2013%2B-blue" alt="macOS 13+">
  <a href="LICENSE"><img src="https://img.shields.io/github/license/ZHlovecat/dihua" alt="MIT"></a>
</p>

<p align="center">
  <img src="docs/assets/hero.svg" width="960" alt="WeChat → Dihua → ChatGPT / Claude / Gemini">
</p>

## Why Dihua

WeChat for Mac (4.1.13+) can forward a batch of messages to "other apps" as a zip — but the only apps allowed in that menu are Tencent's own. Dihua puts a real entry there. Pick the messages, forward, and a moment later your favourite AI desktop app opens with the whole conversation in front of it.

- **One gesture.** Multi-select → Forward → Other apps → *Dihua*. Done.
- **The AI can actually read it.** The zip is unpacked into a tidy workspace: `transcript.md` (time-sorted, speakers marked), the images and videos, and a `meta.json`. Each target app gets it the way it can consume it best.
- **You stay in charge.** Dihua only pre-fills *where the record is and what it is*. What to do with it — summarise, extract to-dos, translate — you say in the AI app, then press Enter.
- **Nothing leaves your Mac through Dihua.** No accounts, no servers, no telemetry. The AI apps talk to their own backends exactly as they always do.

## How it works

<p align="center">
  <img src="docs/assets/screenshots/light-entries.png" width="760" alt="Dihua shows up in WeChat's forward menu">
</p>

1. **Turn on the entry.** Dihua registers a macOS Share Extension; WeChat's *Forward → Other apps → Choose an app on this Mac* lists it.
2. **Forward from WeChat.** Multi-select any messages — text, images, videos, files — and forward them to *Dihua*.
3. **Say what you want.** Dihua opens the target app with the record attached and a short prompt pre-filled. Type your request, press Enter.

<p align="center">
  <img src="docs/assets/screenshots/light-confirm.png" width="640" alt="Delivery confirmation window">
</p>

Prefer zero clicks? Enable **Send directly** and the forward menu lists each target on its own — *Send to ChatGPT*, *Send to Claude*, *Send to Gemini* — with no confirmation window in between.

## Supported targets

| Target | How the record arrives |
|---|---|
| **ChatGPT desktop (Codex)** | Opens a new thread with your Dihua workspace as the project; the prompt is pre-filled. Codex reads `transcript.md` and the images itself. |
| **Claude desktop (Cowork)** | Opens a new Cowork task with the workspace folder attached and the prompt pre-filled. |
| **Gemini desktop** | Drops `transcript.md` and up to 9 images/files into the composer as attachments; the prompt is copied to your clipboard — paste and send. |

<p align="center">
  <img src="docs/assets/screenshots/light-targets.png" width="760" alt="Targets page">
</p>

More targets (Cursor, Kimi, Yuanbao…) only need a small adapter — see [docs](docs/).

## Install

1. Download the dmg for your Mac from [Releases](https://github.com/ZHlovecat/dihua/releases) — `arm64` for Apple Silicon, `x64` for Intel — and drag Dihua to *Applications*.
2. Builds are ad-hoc signed, not notarised. If macOS refuses to open it the first time, right-click *Dihua.app → Open*, or run:
   ```bash
   xattr -d com.apple.quarantine /Applications/Dihua.app
   ```
3. Launch Dihua once. It registers the share entry automatically; if WeChat's menu still doesn't show it, enable *Dihua* under *System Settings → General → Login Items & Extensions → Extensions → Sharing*.

**Requirements:** macOS 13 Ventura or later · WeChat for Mac 4.1.13 or later · at least one of ChatGPT, Claude or Gemini desktop apps.

**Updates:** *About → Check for updates* looks at GitHub Releases and links to the download. Dihua also checks once a day on launch and notifies you when a new version is out.

## What you get on disk

```
~/Documents/dihua/
└── inbox/20260907-231000-Project group/
    ├── transcript.md     # time-sorted, speakers marked, images linked
    ├── meta.json         # counts, time range, parse confidence
    ├── 媒体/             # images & videos (+ .thumb.png for videos)
    └── 原始/             # the original zip and txt from WeChat
```

Records are listed in Dihua's *History*; you can re-send, reveal in Finder, or delete them (with files). Auto-cleanup is configurable.

<p align="center">
  <img src="docs/assets/screenshots/light-general.png" width="760" alt="General settings, light">
  <br>
  <img src="docs/assets/screenshots/dark-confirm.png" width="640" alt="Confirmation window, dark">
</p>

## License

[MIT](LICENSE) © 2026 zhanghang
