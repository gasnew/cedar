const fs = require('fs');

const { ipcMain } = require('electron');
const log = require('electron-log');
const { once } = require('events');
const { Readable, finished: streamFinished } = require('stream');
const util = require('util');
const portAudio = require('naudiodon');

const finished = util.promisify(streamFinished);

const {
  createDestinationStream,
  getDestinationStream,
  clearDestinationData,
} = (() => {
  // NOTE(gnewman): Due to callback hell, we actually do want one top-level
  // variable here so we can manage it like we would any external resource
  // handler
  let destinationStream = null;

  async function createDestinationStream() {
    console.log('await done');
    if (destinationStream) {
      destinationStream.end();
      // Wait until done. Throws if there are errors.
      await finished(destinationStream);
    }

    console.log('next!');
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

  function clearDestinationData() {
    destinationStream = null;
  }

  return {
    createDestinationStream,
    getDestinationStream,
    clearDestinationData,
  };
})();

const {
  pushData,
  dequeueData,
  clearSourceData,
  createSourceStream,
  getSourceStream,
} = (() => {
  let sourceStream = null;
  let dataQueue = [];
  let announceDataHasBeenAdded = null;

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
    console.log('dequeue!');
    if (dataQueue.length === 0) {
      console.log('wait...');
      await new Promise((resolve) => {
        announceDataHasBeenAdded = resolve;
      });
      console.log('done waiting!');
    }
    if (dataQueue.length === 0)
      console.error('Data was somehow not added to the queue! Oh no!');

    return dataQueue.shift();
  }

  function clearSourceData() {
    sourceStream = null;
    dataQueue = [];
    announceDataHasBeenAdded = null;
  }

  function createSourceStream() {
    function streamGenerator() {
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
    sourceStream = Readable.from(streamGenerator());
    console.log('created stream!');
    return sourceStream;
  }

  function getSourceStream() {
    return sourceStream;
  }

  return {
    pushData,
    dequeueData,
    clearSourceData,
    createSourceStream,
    getSourceStream,
  };
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
    const buffer = Buffer.from(chunk.buffer);
    //const buffer2 = new Uint32Array(chunk);
    // TODO AudioIO: Error [ERR_STREAM_WRITE_AFTER_END]: write after end
    const result = await write(buffer);
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
  // NOTE(gnewman): The correlation ID lets the backend associate incoming data
  // with a particular audio destination node. Only one destination node can
  // write to the backend at a time. When `start-playing` is called,
  // correlationId is updated to what was provided, the data queue is cleared,
  // and any incoming data with any other correlationId is ignored.
  let correlationId = 'none';

  async function stopPlaying() {
    const destinationStream = getDestinationStream();
    const sourceStream = getSourceStream();
    if (!destinationStream || !sourceStream) return;

    clearSourceData();
    clearDestinationData();
    // TODO: somehow immediately stop playback?
    sourceStream.destroy();
    destinationStream.end();
    destinationStream.quit();
    // Wait until done. Throws if there are errors.
    await finished(destinationStream);
  }

  ipcMain.on(
    'audio-destination/start-playing',
    async (_, { recordingStartedAt, correlationId: newCorrelationId }) => {
      correlationId = newCorrelationId;
      console.log(newCorrelationId);
      await stopPlaying();

      console.log('STAHT');
      console.log(recordingStartedAt);
      log.info('AUDIO DESTINATION: Render thread told me to start playing...');
      const sourceStream = createSourceStream();
      const destinationStream = await createDestinationStream();
      console.log('destination!!!!');
      sourceStream.once('readable', async () => {
        log.info('starting streaming');
        // TODO: pass in started at time
        destinationStream.start();
        pipeSourceToDestination(sourceStream, destinationStream);
      });
    }
  );

  ipcMain.on(
    'audio-destination/push-data',
    (_, { data, correlationId: dataCorrelationId }) => {
      // TODO: what happens if this gets called before `start-playing`?
      //log.info('AUDIO DESTINATION: Render thread gave me more audio data...');
      if (dataCorrelationId !== correlationId) {
        console.log(
          `Ignoring data from correlation ID: ${dataCorrelationId}. The current correlationId is ${correlationId}.`
        );
        return;
      }
      pushData(data);
    }
  );

  ipcMain.on('audio-destination/stop-playing', async () => {
    log.info('AUDIO DESTINATION: Render thread told me to stop playing...');

    stopPlaying();
  });
}

module.exports = configureAudioDestination;
