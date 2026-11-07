# 20‑20‑20 Timer (Electron + React)

A tiny, distraction‑free desktop timer for Windows and macOS that helps you practice the 20‑20‑20 rule to reduce digital eye strain. Simple input, gentle sounds, and keyboard‑first flow.

## What is the 20‑20‑20 rule?

To help prevent digital eye strain, many optometry sources suggest this habit: every 20 minutes, look at something about 20 feet away for 20 seconds. Short, frequent breaks relax the eye’s focusing effort and can ease symptoms of screen fatigue.

References:

- American Academy of Ophthalmology (AAO) — Computer Use and Your Eyes: https://www.aao.org/eye-health/tips-prevention/computer-usage
- American Optometric Association (AOA) — 20‑20‑20 guidance (PDF): https://www.aoa.org/AOA/Images/Patients/Eye%20Conditions/20-20-20-rule.pdf
- Canadian Association of Optometrists — 20‑20‑20 Rule: https://opto.ca/eye-health-library/20-20-20-rule

## Features

- Minutes‑only input; no scrolling. Always focus/selects the input when useful.
- Start anytime; restart even while running. Stop returns you to input with focus.
- Two‑step flow: Work → 23‑second break → auto‑restart work after a double ping.
- Sounds: soft chimes via local WebAudio (no internet). Work end loops until you act; break end plays twice and continues automatically.
- Keyboard: Enter to continue/restart; Space to start when idle.
- Calm, light‑green UI; menu hidden; fast startup.
- Windows installer and portable builds; macOS `.app` via `electron-builder`.

## Tech stack

- Runtime: Electron 36
- UI: React 19, Vite 7, TypeScript 5.9
- Styling: Tailwind CSS v4 with @tailwindcss/postcss and Autoprefixer
- Audio: WebAudio API (synthesized chimes, no external files)
- Build: esbuild (Electron main/preload), Vite (renderer)
- Packaging: electron‑builder (Windows NSIS + Portable; macOS unpacked `.app`)
- Dev tooling: concurrently, electronmon, wait‑on
- CI: GitHub Actions (Windows + macOS packaging on `v*` tags, published as GitHub Releases)

## System requirements

- Windows 10/11 (x64). On Windows ARM64, enable x64 emulation.
- macOS on Apple silicon (arm64). The Mac build is unsigned (no Apple Developer ID).
- If you encounter VCRUNTIME/MSVCP errors on Windows, install the “Microsoft Visual C++ Redistributable (x64) 2015–2022”.

## Install and use

One command (downloads the latest GitHub Release; no Homebrew or winget):

macOS:

```bash
curl -fsSL https://raw.githubusercontent.com/YonatanAriel/timer/main/scripts/install-mac.sh | bash
```

Windows (PowerShell):

```powershell
irm https://raw.githubusercontent.com/YonatanAriel/timer/main/scripts/install-windows.ps1 | iex
```

Those commands need a published tag (`v0.1.2`, etc.) so CI has uploaded installers. The Mac app is unsigned: the first open may need Control-click → Open.

### Windows

Recommended (installer):

1. Run `release/20 20 20 Timer-Setup-<version>-x64.exe`.
2. Launch from Start Menu ("20 20 20 Timer") and pin if you like.
3. If SmartScreen shows a blue warning, click "More info" → "Run anyway".

Portable (no install):

- Use `release/20 20 20 Timer-Portable-<version>-x64.exe`, or copy the entire `release/win-unpacked` folder and run `20 20 20 Timer.exe` inside it. Keep files together.

### macOS

1. Build with `npm run pack:mac` (see Developer below).
2. Copy `release/mac-arm64/20 20 20 Timer.app` to `/Applications` or the Desktop.
3. Open the `.app`. The first launch of an unsigned app may need Control-click → Open, or System Settings → Privacy & Security → Open Anyway.

Finder draws app icons on macOS’s rounded square. The icon file is transparent; the light tile behind it is the system, not a missing Mac icon.

## Developer

Install deps and run in dev (UI + Electron live reload):

```bash
npm ci
npm run dev
```

Build for local production run:

```bash
npm run build
npm start
```

Package Windows artifacts (installer + portable):

```bash
npm run pack:win
```

Package a macOS `.app` (current machine arch, unsigned):

```bash
npm run pack:mac
```

Output is `release/mac-arm64/20 20 20 Timer.app` on Apple silicon.

Publish Windows and Mac installers: push a version tag. GitHub Actions builds both and attaches files to the GitHub Release.

```bash
git tag v0.1.2
git push origin v0.1.2
```

## Troubleshooting

- If nothing opens on Windows, run from terminal to see logs:

  ```pwsh
  & "%LOCALAPPDATA%\Programs\20 20 20 Timer\20 20 20 Timer.exe" --enable-logging
  # or portable/unpacked path
  & ".\release\win-unpacked\20 20 20 Timer.exe" --enable-logging
  ```

- If nothing opens on macOS:

  ```bash
  "/Applications/20 20 20 Timer.app/Contents/MacOS/20 20 20 Timer" --enable-logging
  ```

- Windows SmartScreen: click “More info” → “Run anyway”.
- Keep the portable EXE with its adjacent files; don’t copy the EXE alone.
- On corporate/locked‑down devices, security software may quarantine unsigned apps; allow/restore in Protection history or ask IT.
