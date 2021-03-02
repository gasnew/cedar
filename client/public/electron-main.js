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
const { once } = require('events');

var portAudio = require('naudiodon');

function runAudio(fileName, sleepTime) {
  //console.log(portAudio.getDevices());
  var ao = new portAudio.AudioIO({
    outOptions: {
      channelCount: 1,
      sampleFormat: portAudio.SampleFormat32Bit,
      sampleRate: 48000,
      deviceId: -1, // Use -1 or omit the deviceId to select the default device
      closeOnError: true, // Close the stream if an audio error is detected, if set false then just log the error
    },
  });
  ao.on('finish', () => {
    console.log("ERROR");
  });

  //// Create a stream to pipe into the AudioOutput
  //// Note that this does not strip the WAV header so a click will be heard at the beginning
  var rs = fs.createReadStream(fileName);
  //function readableStream(data) {
    //let index = 0;
    //return {
      //next: function() {
        //console.log('get data');
        //return {
          //value: data,
          //done: false
        //};
      //},
      //[Symbol.iterator]: function() { return this; }
    //};
  //}
  //const readable = Readable.from(idMaker());
  ////console.log(rs);

  const finished = util.promisify(streamFinished); // (A)

  // USE 2.2.5!!!
  // https://2ality.com/2019/11/nodejs-streams-async-iteration.html
  //ao.start();
  function write(data) {
    return new Promise((resolve) => {
      ao.write(data, null, resolve);
    });
  }
  function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
  async function pipeFileToSpeakers() {
    let i = 0;
    let timeDeltaMs = 0;
    let prevTimeMs = Date.now();
    for await (const chunk of rs) {
      const currentTime = Date.now();
      const chunkMs = chunk.length / 4 / 48;
      timeDeltaMs += currentTime - prevTimeMs - chunkMs;
      prevTimeMs = currentTime;
      console.log('time delta:', timeDeltaMs);
      if (i === 20)
        await sleep(sleepTime);

      console.log('before write', Date.now());
      const result = await write(chunk);
      console.log('after write', Date.now());
      //await sleep(100);
      console.log('result:', String(result));
      if (result === false) {
        // Handle backpressure
        console.log('waito');
        await once(ao, 'drain');
        console.log('drained--time to write more!');
      }
      i++;
    }
    ao.end(); // (C)
    // Wait until done. Throws if there are errors.
    await finished(ao);
  }

  //// Start piping data and start streaming
  rs.once('readable', async () => {
    console.log('STAHT');
    ao.start()
    await pipeFileToSpeakers();
  });
}
runAudio('test2.wav', 0);
runAudio('test2.wav', 4000);
//rs.once('readable', () => {
  //console.log('STAHT');
  //const data = rs.read();
  //console.log(data);
  //const readable = Readable.from(readableStream(data));
  //readable.pipe(ao);
  //ao.start()
//});
//readable.pipe(ao);
//ao.start();
//rs.on('data', chunk => {
  ////console.log('wr');
  //ao.write(chunk, '', console.log)
//});
//const ids = idMaker();
//console.log(ids);
//const myIterable = {};
//myIterable[Symbol.iterator] = function* () {
    //yield 1;
    //yield 2;
    //yield 3;
//};
//console.log(myIterable);
//for (const bob of ids) console.log(bob);

// create a sine wave lookup table
//var sampleRate = 44100;
//var tableSize = 200;
//var buffer = Buffer.allocUnsafe(tableSize * 4);
//for (var i = 0; i < tableSize * 4; i++) {
//buffer[i] = (Math.sin((i / tableSize) * 3.1415 * 2.0) * 127);
//}

//var ao = new portAudio.AudioIO({
//outOptions: {
//channelCount: 1,
//sampleFormat: portAudio.SampleFormat8Bit,
//sampleRate: sampleRate,
//deviceId: -1
//}
//});

//const a = ['close', 'drain', 'error', 'finish', 'pipe', 'unpipe']
//for (let i = 0; i < a.length; i++){
//console.log(a[i]);
//ao.on(a[i], console.log);
//}
//function tenSecondsIsh(writer, data, callback) {
//this.i = 552;
//const write = () => {
//console.log('wr');
//var ok = true;
//do {
//this.i -= 1;
//if (this.i === 0) {
//// last time!
//writer.end(data, callback);
//} else {
//// see if we should continue, or wait
//// don't pass the callback, because we're not done yet.
//console.log('write')
//ok = writer.write(data);
//console.log('Writing data', ok);
//}
//} while (this.i > 0 && ok);
//if (this.i > 0) {
//// had to stop early!
//// write some more once it drains
//console.log("So draining.");
//writer.once('drain', write);
//}
//}
//write();
//return this;
//}
//tenSecondsIsh.prototype.quit = function() { this.i = 1; }

//let tsi = new tenSecondsIsh(ao, buffer, () => console.log.bind(null, "Done!"));
//process.once('SIGINT', () => tsi.quit());

//ao.start();

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
  mainWindow.webContents.on('new-window', function(event, url) {
    event.preventDefault();
    shell.openExternal(url);
  });

  // Open the DevTools (we can's use NODE_ENV because public/ and electron so
  // we check for the absence of an env variable we set in dev mode)
  if (process.env.ELECTRON_START_URL) mainWindow.webContents.openDevTools();

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

  windowHolder.current = createWindow();
  const autoUpdater = configureAutoUpdater(windowHolder);
  autoUpdater.checkForUpdates();

  app.on('activate', function() {
    // On macOS it's common to re-create a window in the app when the
    // dock icon is clicked and there are no other windows open.
    if (BrowserWindow.getAllWindows().length === 0) {
      windowHolder.current = createWindow();
      autoUpdater.checkForUpdates();
    }
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
