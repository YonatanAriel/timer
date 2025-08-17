# Timer (Electron + React)

A very simple, performant desktop timer for Windows 11. Enter hours and minutes, press Start. When time is up, a calm tone plays and a Restart button appears. Clicking Restart stops the tone and starts the timer again from the original duration.

- Stack: Electron, React, Vite, Tailwind, TypeScript
- No extra features beyond the request

## Dev

```pwsh
# install deps
npm i

# run app in dev (UI + electron reload)
npm run dev
```

## Build

```pwsh
npm run build
# then run electron in production mode
npm start
```

## Install on another Windows PC

- Recommended: run the installer in `release/` named like `20 20 20 Timer-Setup-<version>-x64.exe`. If Windows SmartScreen shows a blue warning, click "More info" > "Run anyway".
- Portable: copy the entire folder `release/win-unpacked` to the other PC and run `20 20 20 Timer.exe` inside it. Do not copy only the EXE; it needs the adjacent files.

### Troubleshooting

- If nothing opens, try launching from PowerShell to see errors:

  ```pwsh
  # inside the app folder
  .\"20 20 20 Timer.exe"
  ```

- Make sure you're on Windows 10/11 x64. On Windows ARM64, x64 emulation must be enabled.
- If you see errors about VCRUNTIME or MSVCP DLLs, install "Microsoft Visual C++ Redistributable (x64)" (2015–2022) from Microsoft and try again.
