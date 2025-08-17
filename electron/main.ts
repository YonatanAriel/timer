import { app, BrowserWindow, shell } from "electron";
import { join } from "path";

const isDev = !!process.env.VITE_DEV_SERVER_URL;

let win: BrowserWindow | null = null;

async function createWindow() {
  win = new BrowserWindow({
    width: 420,
    height: 520,
    resizable: false,
    fullscreenable: false,
    title: "20 20 20 timer",
    backgroundColor: "#0B1220",
    autoHideMenuBar: true,
    webPreferences: {
      preload: join(__dirname, "preload.js"),
      // In dev only, relax webSecurity to avoid CORS blocks for remote audio assets
      webSecurity: !isDev,
    },
  });

  if (isDev) {
    await win.loadURL(process.env.VITE_DEV_SERVER_URL!);
    win.webContents.openDevTools({ mode: "detach" });
  } else {
    // In production, 'dist' sits next to the compiled electron files
    const indexPath = join(__dirname, "..", "dist", "index.html");
    await win.loadFile(indexPath);
  }

  win.webContents.setWindowOpenHandler(({ url }) => {
    shell.openExternal(url);
    return { action: "deny" } as any;
  });

  // no always-on-top by default
}

app.whenReady().then(async () => {
  await createWindow();

  app.on("activate", () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on("window-all-closed", () => {
  if (process.platform !== "darwin") {
    app.quit();
  }
});
