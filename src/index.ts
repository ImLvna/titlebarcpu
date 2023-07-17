import { app, Menu, nativeImage, Tray, BrowserWindow, ipcMain } from "electron";
import fs from "fs";
import { cpuUsage as _cpuUsage } from "os-utils";
import { join } from "path";

let window: BrowserWindow;
let cpuItem: Tray;
let curText: string = "0%";

function cpuUsage(): Promise<number> {
  return new Promise((resolve, reject) => {
    _cpuUsage((i) => resolve(Math.floor(i * 100)));
  });
}

async function update() {
  curText = `${await cpuUsage()}%`;
  window.webContents.send("update", curText);
}

app.whenReady().then(() => {
  console.log("ready");
  window = new BrowserWindow({
    width: 60,
    height: 45,
    webPreferences: {
      nodeIntegration: true,
      preload: join(__dirname, "preload.js"),
    },
    backgroundColor: "#00000000",
    show: false,
    skipTaskbar: true,
    autoHideMenuBar: true,
  });
  app.dock.hide();
  window.removeMenu();
  window.setMenu(null);
  window.loadFile(join(__dirname, "index.html"));
  cpuItem = new Tray(nativeImage.createEmpty());
  const contextMenu = Menu.buildFromTemplate([
    { label: "Close", type: "normal" },
  ]);
  contextMenu.items[0].click = () => {
    app.quit();
    cpuItem.destroy();
    console.log("quit");
    process.exit(0);
  };
  cpuItem.setToolTip("This is my application.");
  cpuItem.setContextMenu(contextMenu);

  setInterval(update, 1000);
  ipcMain.on("done", (event, arg) => {
    let width: number;
    switch (curText.length) {
      case 2:
        width = 20;
        break;
      case 3:
        width = 30;
        break;
      case 4:
        width = 40;
        break;
    }
    window.webContents
      .capturePage({ height: 30, width: width!, x: 0, y: 0 })
      .then((image) => {
        const imageData = image.toDataURL();
        cpuItem.setImage(nativeImage.createFromDataURL(imageData));
      });
  });
});
