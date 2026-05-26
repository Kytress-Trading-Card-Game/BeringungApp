const { app, BrowserWindow } = require("electron");
const path = require("path");
const { spawn } = require("child_process");

let backendProcess;

function getPreloadPath() {
  return path.join(__dirname, "electron", "preload.js");
}

function getFrontendIndexPath() {
  if (app.isPackaged) {
    return path.join(process.resourcesPath, "frontend", "index.html");
  }

  return path.join(__dirname, "../BeringungView/dist/BeringungView/browser/index.html");
}

function getBackendExecutablePath() {
  if (app.isPackaged) {
    return path.join(process.resourcesPath, "backend", "BeringungApi.exe");
  }

  return path.join(__dirname, "../BeringungApi/bin/Release/net10.0/win-x64/publish/BeringungApi.exe");
}

function createWindow() {
  const win = new BrowserWindow({
    width: 1400,
    height: 900,
    webPreferences: {
      contextIsolation: true,
      nodeIntegration: false,
      preload: getPreloadPath(),
    },
  });

  win.loadFile(getFrontendIndexPath());
}

app.whenReady().then(() => {
  // Start ASP.NET backend
  backendProcess = spawn(getBackendExecutablePath(), [], {
    detached: false,
		windowsHide: true,
  });

  backendProcess.stdout.on("data", (data) => {
    console.log(`API: ${data}`);
  });

  backendProcess.stderr.on("data", (data) => {
    console.error(`API ERROR: ${data}`);
  });

  createWindow();
});

app.on("window-all-closed", () => {
  if (backendProcess) {
    backendProcess.kill();
  }

  app.quit();
});
