import { contextBridge, ipcRenderer } from "electron";

contextBridge.exposeInMainWorld("electronAPI", {
  onUpdate: (callback: (...args: any[]) => void) =>
    ipcRenderer.on("update", callback),
  done: () => ipcRenderer.send("done"),
});
