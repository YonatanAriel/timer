// electron/main.ts
var import_electron = require("electron");
var import_path = require("path");
var isDev = !!process.env.VITE_DEV_SERVER_URL;
var win = null;
async function createWindow() {
  win = new import_electron.BrowserWindow({
    width: 420,
    height: 520,
    resizable: false,
    fullscreenable: false,
    title: "20 20 20 timer",
    backgroundColor: "#0B1220",
    autoHideMenuBar: true,
    webPreferences: {
      preload: (0, import_path.join)(__dirname, "preload.js"),
      // In dev only, relax webSecurity to avoid CORS blocks for remote audio assets
      webSecurity: !isDev
    }
  });
  if (isDev) {
    await win.loadURL(process.env.VITE_DEV_SERVER_URL);
    win.webContents.openDevTools({ mode: "detach" });
  } else {
    await win.loadFile((0, import_path.join)(__dirname, "..", "dist", "index.html"));
  }
  win.webContents.setWindowOpenHandler(({ url }) => {
    import_electron.shell.openExternal(url);
    return { action: "deny" };
  });
}
import_electron.app.whenReady().then(async () => {
  await createWindow();
  import_electron.app.on("activate", () => {
    if (import_electron.BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});
import_electron.app.on("window-all-closed", () => {
  if (process.platform !== "darwin") {
    import_electron.app.quit();
  }
});
