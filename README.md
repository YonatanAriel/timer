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
