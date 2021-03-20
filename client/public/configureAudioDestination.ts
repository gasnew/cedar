const { ipcMain } = require('electron');
const log = require('electron-log');
const { once } = require('events');
const { Readable, finished: streamFinished } = require('stream');
const util = require('util');
const portAudio = require('naudiodon');

const finished = util.promisify(streamFinished);

const { createDestinationStream, getDestinationStream } = (() => {
  // NOTE(gnewman): Due to callback hell, we actually do want one top-level
  // variable here so we can manage it like we would any external resource
  // handler
  var destinationStream = null;

  async function createDestinationStream() {
    if (destinationStream) {
      destinationStream.end();
      // Wait until done. Throws if there are errors.
      await finished(destinationStream);
    }

    destinationStream = new portAudio.AudioIO({
      outOptions: {
        channelCount: 1,
        sampleFormat: portAudio.SampleFormat32Bit,
        sampleRate: 48000,
        deviceId: -1, // Use -1 or omit the deviceId to select the default device
        closeOnError: true, // Close the stream if an audio error is detected, if set false then just log the error
      },
    });
    return destinationStream;
  }

  function getDestinationStream() {
    return destinationStream;
  }

  return { createDestinationStream, getDestinationStream };
})();

const { pushData, dequeueData, clearDataQueue, createSourceStream } = (() => {
  var sourceStream = null;
  var dataQueue = [];
  var announceDataHasBeenAdded = null;

  function pushData(data) {
    dataQueue.push(data);

    // Announce we've pushed data in case we were waiting on it
    if (announceDataHasBeenAdded) {
      log.info('ANNOUNCEMENT: Audio data has arrived!');
      announceDataHasBeenAdded();
      announceDataHasBeenAdded = null;
    }
  }

  async function dequeueData() {
    if (dataQueue.length === 0) {
      await new Promise((resolve) => {
        announceDataHasBeenAdded = resolve;
      });
    }
    if (dataQueue.length === 0)
      console.error('Data was somehow not added to the queue! Oh no!');

    return dataQueue.shift();
  }

  function clearDataQueue() {
    dataQueue = [];
    announceDataHasBeenAdded = null;
  }

  function createSourceStream() {
    function streamGenerator() {
      let index = 0;
      return {
        next: async function () {
          const data = await dequeueData();
          console.log('get data');
          return {
            value: data,
            done: false,
          };
        },
        [Symbol.iterator]: function () {
          return this;
        },
      };
    }
    return Readable.from(streamGenerator());
  }

  return { pushData, dequeueData, clearDataQueue, createSourceStream };
})();

async function pipeSourceToDestination(sourceStream, destinationStream) {
  function write(data) {
    return new Promise((resolve) => {
      destinationStream.write(data, null, resolve);
    });
  }

  // https://2ality.com/2019/11/nodejs-streams-async-iteration.html#reading-from-readable-streams-via-for-await-of
  for await (const chunk of sourceStream) {
    const time = Date.now();
    const result = await write(chunk);
    console.log(`chunk write delta: ${Date.now() - time}`);
    if (result === false) {
      // Handle backpressure
      console.log(
        'we wrote too fast--need to wait for downstream stream to drain'
      );
      await once(destinationStream, 'drain');
      console.log('drained--time to write more!');
    }
  }
}

function configureAudioDestination() {
  ipcMain.on(
    'audio-destination/start-playing',
    async ({ recordingStartedAt }) => {
      log.info('AUDIO DESTINATION: Render thread told me to start playing...');
      const sourceStream = createSourceStream();
      const destinationStream = await createDestinationStream();
      sourceStream.once('readable', async () => {
        log.info('starting streaming');
        // TODO: pass in started at time
        destinationStream.start();
        pipeSourceToDestination(sourceStream, destinationStream);
      });
    }
  );

  ipcMain.on('audio-destination/push-data', (data) => {
    // TODO: what happens if this gets called before `start-playing`?
    log.info('AUDIO DESTINATION: Render thread gave me more audio data...');
    pushData(data);
  });

  ipcMain.on('audio-destination/stop-playing', async () => {
    log.info('AUDIO DESTINATION: Render thread told me to stop playing...');

    clearDataQueue();
    const destinationStream = getDestinationStream();
    // TODO: somehow immediately stop readable stream?
    destinationStream.end();
    // Wait until done. Throws if there are errors.
    await finished(destinationStream);
  });
}

module.exports = configureAudioDestination;
