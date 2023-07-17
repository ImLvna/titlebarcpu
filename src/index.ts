import {
  app,
  Menu,
  nativeImage,
  Tray,
  BrowserWindow,
  ipcMain,
  BrowserWindowConstructorOptions,
} from "electron";
import fs from "fs";
import { cpuUsage as _cpuUsage, freememPercentage } from "os-utils";
import { join } from "path";

interface textTray extends Tray {
  text: string;
}
interface Entry {
  window: BrowserWindow;
  tray: textTray;
}

const entries: { [key: string]: Entry | undefined } = {
  cpu: undefined,
  memory: undefined,
};

function cpuUsage(): Promise<number> {
  return new Promise((resolve, reject) => {
    _cpuUsage((i) => resolve(Math.floor(i * 100)));
  });
}

async function update() {
  Object.keys(entries).forEach(async (key) => {
    let percentage: number = 0;
    switch (key) {
      case "cpu":
        percentage = await cpuUsage();
        break;
      case "memory":
        percentage = Math.floor(freememPercentage() * 1000);
        break;
    }
    entries[key]!.tray.text = percentage.toString() + "%";
    entries[key]!.window.webContents.send(
      "update",
      entries[key]!.tray.text,
      key
    );
  });
}

app.whenReady().then(() => {
  const windowSettings: BrowserWindowConstructorOptions = {
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
  };
  app.dock.hide();

  const contextMenu = Menu.buildFromTemplate([
    { label: "Close", type: "normal" },
  ]);
  contextMenu.items[0].click = () => {
    app.quit();
    Object.values(entries).forEach((entry) => entry!.tray.destroy());
    process.exit(0);
  };

  Object.keys(entries).forEach((key) => {
    entries[key] = {
      window: new BrowserWindow(windowSettings),
      tray: new Tray(nativeImage.createEmpty()) as textTray,
    };
    entries[key]!.tray.text = "0%";
    entries[key]!.tray.setContextMenu(contextMenu);
    entries[key]!.tray.setToolTip(`${key} Usage`);
    entries[key]!.window.removeMenu();
    entries[key]!.window.setMenu(null);
    entries[key]!.window.loadFile(join(__dirname, "index.html"));
  });

  setInterval(update, 1000);
  ipcMain.on("done", (event, arg) => {
    let width: number;
    switch (entries[arg]!.tray.text.length) {
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
    entries[arg]!.window.webContents.capturePage({
      height: 30,
      width: width!,
      x: 0,
      y: 0,
    }).then((image) => {
      const imageData = image.toDataURL();
      entries[arg]!.tray.setImage(nativeImage.createFromDataURL(imageData));
      // console.log(`Set entry ${arg} image to ${entries[arg]!.tray.text}`);
    });
  });
});
