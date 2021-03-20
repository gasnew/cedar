var fs = require('fs');

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
  var destinationStream = null;

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

// TODO remove
var fileReadStream = fs.createReadStream('public/test2.wav');

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
    var i = 0;
    console.log(chunk.buffer);
    for (const value of buffer.values()) {
      if (i < 10) console.log(value);
      i++;
    }
    //for (const value of buffer2.values()) {
    //if (i < 10)
    //console.log(value);
    //i++
    //}
    for (let i = 0; i < 10; i++) {
      console.log(chunk[i]);
    }
    //console.log(chunk[1], chunk[20], chunk[10]);
    //console.log(buffer.readUInt32BE(1) / (1000000000), buffer.readUInt32BE(20) / (1000000000), buffer.readUInt32BE(10) / (1000000000));
    //console.log(buffer.readUInt32LE(1) / (1000000000), buffer.readUInt32LE(20) / (1000000000), buffer.readUInt32LE(10) / (1000000000));
    //console.log(chunk.length, buffer.length);
    // TODO AudioIO: Error [ERR_STREAM_WRITE_AFTER_END]: write after end
    const result = await write(buffer);
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
    async (_, { recordingStartedAt }) => {
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

  ipcMain.on('audio-destination/push-data', (_, data) => {
    // TODO: what happens if this gets called before `start-playing`?
    //log.info('AUDIO DESTINATION: Render thread gave me more audio data...');
    pushData(data);
  });

  ipcMain.on('audio-destination/stop-playing', async () => {
    log.info('AUDIO DESTINATION: Render thread told me to stop playing...');

    const destinationStream = getDestinationStream();
    const sourceStream = getSourceStream();
    clearSourceData();
    clearDestinationData();
    // TODO: somehow immediately stop playback?
    sourceStream.destroy();
    destinationStream.end();
    destinationStream.quit();
    // Wait until done. Throws if there are errors.
    await finished(destinationStream);
  });
}

module.exports = configureAudioDestination;
