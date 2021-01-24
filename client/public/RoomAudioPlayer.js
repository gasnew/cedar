// WARNING(gnewman): Be *very* careful editing this file, as it is JS, not TS.

class BufferHealthHandler {
  constructor(postBufferHealthData) {
    this.postBufferHealthData = postBufferHealthData;
    // Let's store health data at 60 Hz and send data out once a second
    this.bufferHealthSecondsBuffer = new Float32Array(60);
    this.timeOfLastPost = 0;
    this.running = false;
  }

  startPeriodicDataPosts() {
    this.timeOfLastPost = Date.now();
    this.running = true;
  }

  stopPeriodicDataPosts() {
    this.running = false;
  }

  update(bufferHealthSeconds) {
    if (!this.running) return;
    // This can happen if update is called soon after posting data.
    if (Date.now() - this.timeOfLastPost < 0) return;

    const bufferIndex = Math.floor(
      ((Date.now() - this.timeOfLastPost) / 1000) * 60
    );
    this.bufferHealthSecondsBuffer[bufferIndex] = bufferHealthSeconds;

    if (bufferIndex >= this.bufferHealthSecondsBuffer.length - 1)
      this.postData();
  }

  postData() {
    this.postBufferHealthData(this.bufferHealthSecondsBuffer);
    // NOTE(gnewman): We just add 1000 ms here instead of setting
    // timeOfLastPost to Date.now() because downstream clients expect every 60
    // samples to correspond to exactly one second. We do not want to
    // accidentally send more than 60 samples per second and would rather miss
    // a sample or two instead.
    this.timeOfLastPost += 1000;
  }
}

// TODO: Summarize the API and functionality of this module
class RoomAudioPlayer extends AudioWorkletProcessor {
  constructor() {
    super();

    // This is currently not configurable via Web Audio API
    this.frameSize = 128;

    const sampleRate = 48000;
    // Buffer up to a whole minute of PCM data in a ring buffer
    this.bufferLength = sampleRate * 60;
    this.pcmBuffers = [];
    this.bufferWriteIndices = [];
    this.bufferReadIndex = 0;

    this.prevTimeMs = 0;
    this.timeDeltaMs = 0;
    this.timeThresholdMs = (this.frameSize / sampleRate) * 1000;

    this.bufferHealthHandler = new BufferHealthHandler(bufferHealthSeconds =>
      this.port.postMessage(bufferHealthSeconds)
    );
    this.port.onmessage = event => {
      if (event.data && event.data.action) {
        if (event.data.action === 'initialize') {
          // Initialize buffers and write indices, and set delay
          const { delaySeconds, recordingStartedAt, trackCount } = event.data;
          this.pcmBuffers = new Array(trackCount);
          this.bufferWriteIndices = new Array(trackCount);
          for (let i = 0; i < this.pcmBuffers.length; i++) {
            this.pcmBuffers[i] = new Float32Array(this.bufferLength);
            this.bufferWriteIndices[i] = 0;
          }
          this.delaySamples = Math.floor(sampleRate * delaySeconds);
          this.bufferReadIndex = this.bufferLength - this.delaySamples;
          this.timeDeltaMs = 0;
          // NOTE(gnewman): Some time (10s to 100s of ms) will have passed
          // since the recording's startedAt time was set. We will need this
          // node to "catch up" to make up for that elapsed time where it
          // wasn't playing audio data.
          this.prevTimeMs = recordingStartedAt;

          this.bufferHealthHandler.startPeriodicDataPosts();
        } else if (event.data.action === 'buffer') {
          // Append data to buffer, assuming stream data always comes in in the
          // same order (port uses a FIFO queue)
          const { pcm, pcmIndex } = event.data;
          if (this.pcmBuffers.length === 0 || pcm.length === 0) return;

          // Append PCM data
          const stream = pcm;
          const dataLength = stream.length;
          const bufferWriteIndex = this.bufferWriteIndices[pcmIndex];
          for (let i = 0; i < dataLength; i++) {
            const wrappedWriteIndex =
              (bufferWriteIndex + i) % this.bufferLength;
            this.pcmBuffers[pcmIndex][wrappedWriteIndex] = stream[i];
          }
          // move buffer write index (wrap if reached end)
          this.bufferWriteIndices[pcmIndex] =
            (bufferWriteIndex + dataLength) % this.bufferLength;
        } else if (event.data.action === 'stop') {
          // Clear buffers
          this.pcmBuffers = [];
          this.bufferWriteIndices = [];
          this.bufferReadIndex = 0;

          this.bufferHealthHandler.stopPeriodicDataPosts();
        }
      }
    };
  }

  process(inputs, outputs, parameters) {
    if (this.pcmBuffers.length === 0) {
      for (let i = 0; i < this.frameSize; i++) outputs[0][0][i] = 0.0;
      return true;
    }

    const currentTime = Date.now();
    //                (elapsed time ms)               - (ideal elapsed time ms)
    this.timeDeltaMs += currentTime - this.prevTimeMs - 128 / 48;
    this.prevTimeMs = currentTime;

    //if (inputs[0][0].length !== 128)
    //console.log(`YOOOO: ${input[0].length}`);
    if (outputs[0][0].length !== 128)
      console.log(`FOOOO: ${outputs[0][0].length}`);

    const bufferCount = this.pcmBuffers.length;
    for (let frameIndex = 0; frameIndex < this.frameSize; frameIndex++) {
      const readIndex = (this.bufferReadIndex + frameIndex) % this.bufferLength;
      for (let pcmIndex = 0; pcmIndex < bufferCount; pcmIndex++) {
        outputs[pcmIndex][0][frameIndex] = this.pcmBuffers[pcmIndex][readIndex];
        // We need to zero this out in case we've gone through the buffer once,
        // and we haven't received data for this part of the track yet. This is
        // likely to happen if another musician loses connection or has a spotty
        // connection, especially when they are close to you in the chain.
        this.pcmBuffers[pcmIndex][readIndex] = 0;
      }
    }
    this.bufferReadIndex =
      (this.bufferReadIndex + this.frameSize) % this.bufferLength;

    // If we are behind on playback because we somehow missed rendering an
    // audio quantum, skip ahead a few frames. This does not happen as
    // frequently as when the OS skips audio input quanta, but it can still
    // happen. Skipping one frame lets us keep what plays out of our speakers
    // up-to-date with real-time. This is crucial so that our outgoing audio
    // data (to the next musician) is synced with what this musician hears in
    // the speakers.
    // TODO (gnewman):
    // - Consider a smaller or larger threshold? We have a couple of frames of
    //   leeway given how Web Audio API queues up render requests
    // - Use a fancy algorithm to time-compress without losing data
    if (this.timeDeltaMs > this.timeThresholdMs * 3) {
      while (this.timeDeltaMs > this.timeThresholdMs) {
        // Zero out skipped frame
        for (let frameIndex = 0; frameIndex < this.frameSize; frameIndex++) {
          const readIndex =
            (this.bufferReadIndex + frameIndex) % this.bufferLength;
          for (let pcmIndex = 0; pcmIndex < bufferCount; pcmIndex++) {
            this.pcmBuffers[pcmIndex][readIndex] = 0;
          }
        }
        this.bufferReadIndex =
          (this.bufferReadIndex + this.frameSize) % this.bufferLength;

        this.timeDeltaMs -= this.timeThresholdMs;
      }
    }

    this.bufferHealthHandler.update(
      (this.bufferWriteIndices[this.bufferWriteIndices.length - 1] -
        this.bufferReadIndex) /
        48000
    );

    return true;
  }
}

registerProcessor('RoomAudioPlayer', RoomAudioPlayer);
