import { contextBridge } from "electron";

contextBridge.exposeInMainWorld("appApi", {
  // Reserved for future use if needed.
});
