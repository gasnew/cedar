// NOTE(gnewman): This file is modified from the template here:
// https://github.com/electron/electron-quick-start/blob/master/main.js
//
// NOTE(gnewman): I made some changes to this file and others following this
// Medium article on how to integrate React with Electron:
// https://www.freecodecamp.org/news/building-an-electron-application-with-create-react-app-97945861647c/

// Modules to control application life and create native browser window
// @ts-ignore We need to do require-style imports for this file because
//            ES6-style imports are not supported by electron.
const { app, BrowserWindow, ipcMain, shell } = require('electron');
const log = require('electron-log');
const { autoUpdater } = require('electron-updater');
var fs = require('fs');
const { Readable, finished: streamFinished } = require('stream');
const util = require('util');
const isDev = require('electron-is-dev');

const configureAudioDestination = require('./configureAudioDestination.js');

var portAudio = require('naudiodon');

const path = require('path');
const url = require('url');

autoUpdater.logger = log;
autoUpdater.logger.transports.file.level = 'info';
autoUpdater.autoDownload = true;
autoUpdater.autoInstallOnAppQuit = true;
log.info('App starting...');

function configureAutoUpdater(windowHolder) {
  function forwardAutoUpdaterEvent(eventName) {
    autoUpdater.on(eventName, (...args) => {
      log.info(`Forwarding event ${eventName}`);
      windowHolder.current.webContents.send(eventName, ...args);
    });
  }

  ipcMain.on('check-for-updates', () => {
    log.info('Render thread told me to check for updates...');
    autoUpdater.checkForUpdates();
  });
  ipcMain.on('quit-and-install', () => {
    log.info('Render thread told me to quit and install...');
    autoUpdater.quitAndInstall();
  });

  forwardAutoUpdaterEvent('checking-for-update');
  forwardAutoUpdaterEvent('update-available');
  forwardAutoUpdaterEvent('update-not-available');
  forwardAutoUpdaterEvent('error');
  forwardAutoUpdaterEvent('download-progress');
  forwardAutoUpdaterEvent('update-downloaded');

  return autoUpdater;
}

function createWindow() {
  // Create the browser window.
  const mainWindow = new BrowserWindow({
    width: 1000,
    height: 800,
    show: false,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      worldSafeExecuteJavaScript: true,
      contextIsolation: true,
    },
  });

  // Open hyperlinks in the browser rather than Electron window
  // (https://github.com/electron/electron/issues/1344).
  mainWindow.webContents.on('new-window', function (event, url) {
    event.preventDefault();
    shell.openExternal(url);
  });

  // Open the DevTools (we can's use NODE_ENV because public/ and electron so
  // we check for the absence of an env variable we set in dev mode)
  if (isDev) mainWindow.webContents.openDevTools();

  // Load from the local React App (dev) or from index.html (prod).
  const startUrl =
    process.env.ELECTRON_START_URL ||
    url.format({
      pathname: path.join(__dirname, '../build/index.html'),
      protocol: 'file:',
      slashes: true,
    });
  mainWindow.loadURL(startUrl);
  mainWindow.showInactive();

  return mainWindow;
}

// This method will be called when Electron has finished
// initialization and is ready to create browser windows.
// Some APIs can only be used after this event occurs.
app.whenReady().then(() => {
  // A dirty hack so the autoUpdater object can always get the current window,
  // even after hiding and showing again on MacOS
  const windowHolder = { current: null };

  configureAudioDestination();
  windowHolder.current = createWindow();
  const autoUpdater = configureAutoUpdater(windowHolder);
  if (!isDev) autoUpdater.checkForUpdates();

  app.on('activate', function () {
    // On macOS it's common to re-create a window in the app when the
    // dock icon is clicked and there are no other windows open.
    if (BrowserWindow.getAllWindows().length === 0) {
      windowHolder.current = createWindow();
      if (!isDev) autoUpdater.checkForUpdates();
    }
  });
});

// Quit when all windows are closed.
app.on('window-all-closed', function () {
  // On macOS it is common for applications and their menu bar
  // to stay active until the user quits explicitly with Cmd + Q
  if (process.platform !== 'darwin') app.quit();
});

// In this file you can include the rest of your app's specific main process
// code. You can also put them in separate files and require them here.
