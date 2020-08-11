// NOTE(gnewman): This file is modified from the template here:
// https://github.com/electron/electron-quick-start/blob/master/main.js
//
// NOTE(gnewman): I made some changes to this file and others following this
// Medium article on how to integrate React with Electron:
// https://www.freecodecamp.org/news/building-an-electron-application-with-create-react-app-97945861647c/

// Modules to control application life and create native browser window
// @ts-ignore We need to do require-style imports for this file because
//            ES6-style imports are not supported by electron.
const { app, BrowserWindow } = require('electron');
const path = require('path');

function createWindow() {
  // Create the browser window.
  const mainWindow = new BrowserWindow({
    width: 1000,
    height: 800,
    webPreferences: {
      preload: path.join(__dirname, 'preload.ts'),
    },
  });

  // and load the index.html of the app.
  // TODO(gnewman): Put this URL into an env variable someday
  mainWindow.loadURL('http://localhost:3000');

  // Open the DevTools.
  mainWindow.webContents.openDevTools();
}

// Configure Electron to not require user interaction before allowing audio to
// be played
// TODO: Maybe remove this if we don't need it
//app.commandLine.appendSwitch('autoplay-policy', 'no-user-gesture-required');

// This method will be called when Electron has finished
// initialization and is ready to create browser windows.
// Some APIs can only be used after this event occurs.
app.whenReady().then(() => {
  createWindow();

  app.on('activate', function() {
    // On macOS it's common to re-create a window in the app when the
    // dock icon is clicked and there are no other windows open.
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

// Quit when all windows are closed.
app.on('window-all-closed', function() {
  // On macOS it is common for applications and their menu bar
  // to stay active until the user quits explicitly with Cmd + Q
  if (process.platform !== 'darwin') app.quit();
});

// In this file you can include the rest of your app's specific main process
// code. You can also put them in separate files and require them here.
