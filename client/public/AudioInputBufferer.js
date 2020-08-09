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
    // thread each second and thus how many requests we send out over websocket
    // each second. Opus natively supports a frame size of 20, so we set this
    // to 5 so we can devide our frame size of 128 into that evenly
    const chunksPerSecond = 5;
    const sampleRate = 48000;
    // Should be 75, so buffering reduces our outgoing websocket packets by
    // ~100-fold
    this.framesPerChunk = Math.floor(
      sampleRate / chunksPerSecond / this.frameSize
    );
    this.chunkBuffer = new Float32Array(this.framesPerChunk * this.frameSize);
    this.framesInBuffer = 0;

    // State management
    this.playing = false;
    this.delayFrames = 0;
    this.framesDelayed = 0;
    this.port.onmessage = event => {
      if (event.data && event.data.action && event.data.delaySeconds) {
        const { action } = event.data;

        if (action === 'start') {
          if (this.playing) return;
          this.playing = true;
          // Assume we don't need to delay by less than 128-sample granularity
          this.delayFrames = Math.floor(
            (sampleRate * event.data.delaySeconds) / this.frameSize
          );
          this.framesDelayed = 0;
        }
      }
    };
  }

  process(inputs, outputs, parameters) {
    if (!this.playing) return true;

    // We assume we only have one input connection
    const input = inputs[0];
    const output = outputs[0];

    // Delay this frame, or buffer input
    if (this.framesDelayed < this.delayFrames) this.framesDelayed += 1;
    else {
      // We only support one channel right now
      const channel = input[0];
      for (let i = 0; i < this.frameSize; i++) {
        this.chunkBuffer[this.framesInBuffer * this.frameSize + i] = channel[i];
      }
      this.framesInBuffer += 1;

      // Post chunk if the buffer is full
      if (this.framesInBuffer === this.framesPerChunk) {
        this.port.postMessage(this.chunkBuffer);
        this.framesInBuffer = 0;
      }
    }

    return true;
  }
}

registerProcessor('AudioInputBufferer', AudioInputBufferer);
