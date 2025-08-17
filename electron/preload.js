// electron/preload.ts
var import_electron = require("electron");
import_electron.contextBridge.exposeInMainWorld("appApi", {
  // Reserved for future use if needed.
});
