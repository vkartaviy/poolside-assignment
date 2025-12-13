/**
 * Electron main process.
 */

import { app, BrowserWindow, shell } from 'electron';
import { electronApp, optimizer, is, platform } from '@electron-toolkit/utils';
import path from 'node:path';
import { registerHostProtocol } from './protocol';

// Web app dev server URL
const DEV_SERVER_URL = 'http://localhost:5173';

function createWindow(): BrowserWindow {
  const window = new BrowserWindow({
    width: 500,
    height: 800,
    minWidth: 500,
    minHeight: 500,
    center: true,
    transparent: true,
    darkTheme: true,
    show: false,
    webPreferences: {
      preload: path.join(__dirname, '../preload/index.mjs'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: false,
    },
    // macOS specific: hidden title bar with inset traffic lights
    ...(platform.isMacOS
      ? {
          titleBarStyle: 'hiddenInset',
          trafficLightPosition: { x: 12, y: 12 },
        }
      : {
          // Windows/Linux: use default frame
          frame: true,
        }),
  });

  window.on('ready-to-show', () => {
    window.show();
  });

  window.webContents.setWindowOpenHandler((details) => {
    void shell.openExternal(details.url);

    return { action: 'deny' };
  });

  // Load the web app:
  // - Dev: Load from the web app's Vite dev server
  // - Prod: Load the built web app files
  if (is.dev) {
    void window.loadURL(DEV_SERVER_URL);
  } else {
    void window.loadFile(path.join(__dirname, '../renderer/index.html'));
  }

  return window;
}

if (platform.isMacOS && app.dock) {
  const image = app.isPackaged
    ? path.join(process.resourcesPath, 'icon.png')
    : path.join(__dirname, '../../resources/icon.png');

  app.dock?.setIcon(image);
}

// This method will be called when Electron has finished
// initialization and is ready to create browser windows.
// Some APIs can only be used after this event occurs.
app.whenReady().then(() => {
  // Register host protocol IPC handlers
  registerHostProtocol();

  // Set app user model id for windows
  electronApp.setAppUserModelId('com.electron');

  // Default open or close DevTools by F12 in development
  // and ignore CommandOrControl + R in production.
  app.on('browser-window-created', (_, window) => {
    optimizer.watchWindowShortcuts(window);
  });

  let mainWindow = createWindow();

  app.on('activate', () => {
    // On macOS it's common to re-create a window in the app when the
    // dock icon is clicked and there are no other windows open.
    if (BrowserWindow.getAllWindows().length === 0 || mainWindow.isDestroyed()) {
      mainWindow = createWindow();
    }
  });
});

// Quit when all windows are closed, except on macOS. There, it's common
// for applications and their menu bar to stay active until the user quits
// explicitly with Cmd + Q.
app.on('window-all-closed', () => {
  if (!platform.isMacOS) {
    app.quit();
  }
});
