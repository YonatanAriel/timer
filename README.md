# 20‑20‑20 Timer (Electron + React)

A tiny, distraction‑free desktop timer for Windows that helps you practice the 20‑20‑20 rule to reduce digital eye strain. Simple input, gentle sounds, and keyboard‑first flow.

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
- Windows installer and portable builds.

## Tech stack

- Runtime: Electron 36
- UI: React 19, Vite 7, TypeScript 5.9
- Styling: Tailwind CSS v4 with @tailwindcss/postcss and Autoprefixer
- Audio: WebAudio API (synthesized chimes, no external files)
- Build: esbuild (Electron main/preload), Vite (renderer)
- Packaging: electron‑builder (NSIS installer + Portable)
- Dev tooling: concurrently, electronmon, wait‑on
- CI: GitHub Actions (Windows packaging workflow)

## System requirements

- Windows 10/11 (x64). On Windows ARM64, enable x64 emulation.
- If you encounter VCRUNTIME/MSVCP errors, install the “Microsoft Visual C++ Redistributable (x64) 2015–2022”.

## Install and use

Recommended (installer):

1. Run `release/20 20 20 Timer-Setup-<version>-x64.exe`.
2. Launch from Start Menu ("20 20 20 Timer") and pin if you like.
3. If SmartScreen shows a blue warning, click "More info" → "Run anyway".

Portable (no install):

- Use `release/20 20 20 Timer-Portable-<version>-x64.exe`, or copy the entire `release/win-unpacked` folder and run `20 20 20 Timer.exe` inside it. Keep files together.

## Developer

Install deps and run in dev (UI + Electron live reload):

```pwsh
cd C:\Users\yonat\repos\timer
npm ci
npm run dev
```

Build for local production run:

```pwsh
npm run build
npm start
```

Package Windows artifacts (installer + portable):

```pwsh
npm run pack:win
start .\release
```

## Troubleshooting

- If nothing opens, run from terminal to see logs:

  ```pwsh
  & "%LOCALAPPDATA%\Programs\20 20 20 Timer\20 20 20 Timer.exe" --enable-logging
  # or portable/unpacked path
  & ".\release\win-unpacked\20 20 20 Timer.exe" --enable-logging
  ```

- SmartScreen: click “More info” → “Run anyway”.
- Keep the portable EXE with its adjacent files; don’t copy the EXE alone.
- On corporate/locked‑down devices, security software may quarantine unsigned apps; allow/restore in Protection history or ask IT.
