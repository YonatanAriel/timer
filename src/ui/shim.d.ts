export {};

declare global {
  interface Window {
    appApi: unknown;
    webkitAudioContext?: typeof AudioContext;
  }
}
