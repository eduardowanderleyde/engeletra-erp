const { app, BrowserWindow, Menu } = require("electron");
const { spawn } = require("child_process");
const path = require("path");

let backendProcess;

function startBackend() {
  const backendDir = path.join(__dirname, "..", "backend");
  const venvPython = process.platform === "win32"
    ? path.join(backendDir, ".venv3", "Scripts", "python.exe")
    : path.join(backendDir, ".venv3", "bin", "python");
  backendProcess = spawn(
    venvPython,
    ["-m", "uvicorn", "engeletra_api.main:app", "--host", "127.0.0.1", "--port", "8787"],
    { cwd: backendDir, stdio: "ignore" }
  );
}

function createWindow() {
  const win = new BrowserWindow({
    width: 1440,
    height: 920,
    minWidth: 1100,
    minHeight: 720,
    title: "Engeletra ERP",
    backgroundColor: "#f3f5f4",
    autoHideMenuBar: true,
    webPreferences: {
      contextIsolation: true,
      nodeIntegration: false
    }
  });

  Menu.setApplicationMenu(null);

  const devUrl = process.env.ENGELETRA_FRONTEND_URL || "http://127.0.0.1:5177";
  win.loadURL(devUrl);
}

app.whenReady().then(() => {
  startBackend();
  setTimeout(createWindow, 1200);
});

app.on("window-all-closed", () => {
  if (backendProcess) backendProcess.kill();
  if (process.platform !== "darwin") app.quit();
});

app.on("activate", () => {
  if (BrowserWindow.getAllWindows().length === 0) createWindow();
});
