// WARNING(gnewman): Be *very* careful editing this file, as it is JS, not TS.
// Apparently TS doesn't support this yet, but we could think about adding
// these types someday:
// https://github.com/microsoft/TypeScript/issues/28308#issuecomment-650802278

class AudioInputBufferer extends AudioWorkletProcessor {
  constructor() {
    super();

    // TODO: Move chunksPerSecond, etc. out into parameters
    // This is currently not configurable via Web Audio API
    this.frameSize = 128;
    // chunksPerSecond corresponds to how many messages we send to the main
    // thread each second. Opus natively supports a frame size of 20, so we set
    // this to 5 so we can devide our frame size of 128 into that evenly
    const chunksPerSecond = 5;
    const sampleRate = 48000;
    // Should be 75
    this.framesPerChunk = Math.floor(
      sampleRate / chunksPerSecond / this.frameSize
    );
    this.chunkBuffer = new Float32Array(this.framesPerChunk * this.frameSize);
    this.framesInBuffer = 0;
    // If timeDeltaMs exceeds this value, we take special action to "catch up"
    // our output buffer to real time
    this.timeThresholdMs = (this.frameSize / sampleRate) * 1000;

    this.mixedChannels = new Float32Array(this.frameSize);

    // State management
    this.playing = false;
    this.delayFrames = 0;
    this.framesDelayed = 0;
    this.prevTimeMs = 0; // Used to track time elapsed between frames
    // Actual time elapsed - frame-time elapsed; used to keep the mic
    // up-to-date with real time
    this.timeDeltaMs = 0;
    this.port.onmessage = event => {
      if (event.data && event.data.action) {
        const { action } = event.data;

        if (action === 'start') {
          if (this.playing) return;
          this.prevTimeMs = Date.now();
          this.timeDeltaMs = 0;
          this.playing = true;
          this.framesInBuffer = 0;
          // Assume we don't need to delay by less than 128-sample granularity
          this.delayFrames = Math.floor(
            (sampleRate * event.data.delaySeconds) / this.frameSize
          );
          this.framesDelayed = 0;
        } else if (action === 'stop') {
          this.playing = false;
          this.delayFrames = 0;
          this.framesDelayed = 0;
          this.framesInBuffer = 0;
        }
      }
    };
  }

  process(inputs, outputs, parameters) {
    if (!this.playing) return true;

    const currentTime = Date.now();
    //                (elapsed time ms)               - (ideal elapsed time ms)
    this.timeDeltaMs += currentTime - this.prevTimeMs - 128 / 48;
    this.prevTimeMs = currentTime;

    // We assume we only have one input connection
    const input = inputs[0];
    const output = outputs[0];
    if (input[0].length !== 128) console.log(`YOOOO: ${input[0].length}`);
    if (output[0].length !== 128) console.log(`FOOOO: ${output[0].length}`);

    // Delay this frame, or buffer input
    if (this.framesDelayed < this.delayFrames) this.framesDelayed += 1;
    else {
      // NOTE(gnewman): Perform a rudimentary mixing of channels. Down the
      // road, I'd prefer for musicians to be able to independently mix their
      // input channels. We'd implement this using a ChannelSplitterNode,
      // GainNodes, then probably a ChannelMergerNode into AudioInputBufferer.
      // Additionally, instead of mixing the channels together here, we could
      // play around with keeping these channels separate, as Opus supports
      // many channels in a single data packet.
      for (let i = 0; i < this.frameSize; i++) {
        this.mixedChannels[i] = 0.0;
        for (let j = 0; j < input.length; j++) {
          this.mixedChannels[i] += input[j][i];
        }
      }

      // Spread incoming data over two frames if we are behind. This can happen
      // when the OS forgets/neglects to ask the input device for an audio
      // quantum. Playing a single frame twice like this lets us smooth over
      // audio "glitches" that occur as a result and keep our outgoing audio
      // stream synced with real time.
      // TODO(gnewman): A more ideal solution would time-scale this frame while
      // preserving pitch. There are well-described methods to do this, but it
      // was going to be too much work for this initial pass. Still,
      // implementing a smarter way of keeping the mic in time will
      // significantly improve perceived audio quality.
      if (this.timeDeltaMs > this.timeThresholdMs) {
        for (let half = 0; half < 2; half++) {
          for (let i = 0; i < this.frameSize; i++) {
            const newSample =
              (this.mixedChannels[i] + this.mixedChannels[i]) / 2;
            this.chunkBuffer[
              this.framesInBuffer * this.frameSize + i
            ] = newSample;
          }
          this.framesInBuffer += 1;
          if (this.framesInBuffer === this.framesPerChunk) {
            this.port.postMessage(this.chunkBuffer);
            this.framesInBuffer = 0;
          }
        }
        this.timeDeltaMs -= this.timeThresholdMs;
      } else {
        for (let i = 0; i < this.frameSize; i++) {
          this.chunkBuffer[
            this.framesInBuffer * this.frameSize + i
          ] = this.mixedChannels[i];
        }
        this.framesInBuffer += 1;
        if (this.framesInBuffer === this.framesPerChunk) {
          // TODO (gnewman): Instead of copying buffers to send them across
          // threads, use SharedArrayBuffer between the main thread and
          // AudioWorklet thread.
          this.port.postMessage(this.chunkBuffer);
          this.framesInBuffer = 0;
        }
      }
    }

    return true;
  }
}

registerProcessor('AudioInputBufferer', AudioInputBufferer);
