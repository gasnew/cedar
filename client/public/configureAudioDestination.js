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

  async function createDestinationStream(deviceId) {
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
        deviceId, // Use -1 or omit the deviceId to select the default device
        closeOnError: false, // If true, close the stream if an audio error is detected; if set false then just log the error
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
      announceDataHasBeenAdded();
      announceDataHasBeenAdded = null;
    }
  }

  async function dequeueData(correlationId) {
    let data = null;

    while (!data) {
      if (dataQueue.length === 0) {
        await new Promise((resolve) => {
          announceDataHasBeenAdded = resolve;
        });
      }
      if (dataQueue.length === 0) {
        console.error('Data was somehow not added to the queue! Oh no!');
        return new Uint32Array(0);
      }

      const retrievedData = dataQueue.shift();
      if (retrievedData.correlationId !== correlationId) {
        console.log(
          `Ignoring data from correlation ID: ${retrievedData.correlationId}. The current correlationId is ${correlationId}.`
        );
      } else data = retrievedData.data;
    }

    return data;
  }

  function clearSourceData() {
    sourceStream = null;
    dataQueue = [];
    announceDataHasBeenAdded = null;
  }

  function createSourceStream(correlationId) {
    function streamGenerator() {
      return {
        next: async function () {
          const booga = Math.random();
          const data = await dequeueData(correlationId);
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
    const buffer = Buffer.from(chunk.buffer);
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
    sourceStream.destroy();
    destinationStream.abort();
  }

  ipcMain.on(
    'audio-destination/start-playing',
    async (_, { recordingStartedAt, correlationId: newCorrelationId, deviceId }) => {
      correlationId = newCorrelationId;
      await stopPlaying();

      log.info('AUDIO DESTINATION: Render thread told me to start playing...');
      const sourceStream = createSourceStream(correlationId);
      const destinationStream = await createDestinationStream(deviceId);
      sourceStream.once('readable', async () => {
        pipeSourceToDestination(sourceStream, destinationStream);
        destinationStream.start(recordingStartedAt);
      });
    }
  );

  ipcMain.on('audio-destination/push-data', (_, dataWithCorrelationId) => {
    pushData(dataWithCorrelationId);
  });

  ipcMain.on('audio-destination/stop-playing', async () => {
    log.info('AUDIO DESTINATION: Render thread told me to stop playing...');

    stopPlaying();
  });

  ipcMain.handle('audio-destination/get-devices', async (event) => {
    return portAudio
      .getDevices()
      .filter((device) => device.maxOutputChannels > 0);
  });
}

module.exports = configureAudioDestination;
