import { app, BrowserWindow } from 'electron';
import path from 'path';
import { initWindowManager } from './window-manager';
import { registerIpcHandlers } from './ipc';

// Define the main window variable
let mainWindow: BrowserWindow | null = null;

const isDev = process.env.NODE_ENV === 'development' || process.env.DEBUG_PROD === 'true';

async function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    webPreferences: {
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
      preload: path.join(__dirname, 'preload.js'),
    },
    title: 'Gemini Desktop',
    icon: path.join(__dirname, '../../resources/icon.png'),
    show: false,
  });

  if (isDev) {
    // Check if dev server is running or wait for it
    mainWindow.loadURL('http://localhost:5173');
    mainWindow.webContents.openDevTools();
  } else {
    mainWindow.loadFile(path.join(__dirname, '../renderer/index.html'));
  }

  mainWindow.once('ready-to-show', () => {
    mainWindow?.show();
  });

  mainWindow.on('closed', () => {
    mainWindow = null;
  });

  initWindowManager(mainWindow);
}

// Prevent Google from detecting the browser as automated
app.commandLine.appendSwitch('disable-blink-features', 'AutomationControlled');
// Improve compatibility with OAuth flows
app.commandLine.appendSwitch('disable-features', 'CrossOriginOpenerPolicy,IsolateOrigins,site-per-process');
app.commandLine.appendSwitch('allow-running-insecure-content');
app.commandLine.appendSwitch('remote-debugging-port', '0');

app.whenReady().then(async () => {
  registerIpcHandlers();
  await createWindow();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});
