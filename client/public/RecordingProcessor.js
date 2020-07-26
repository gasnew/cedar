// WARNING(gnewman): Be *very* careful editing this file, as it is JS, not TS.
// Apparently TS doesn't support this yet, but we could think about adding
// these types someday:
// https://github.com/microsoft/TypeScript/issues/28308#issuecomment-650802278

class RecordingProcessor extends AudioWorkletProcessor {
  constructor() {
    super();

    // TODO: Move chunksPerSecond, etc. out into parameters
    // This is currently not configurable via Web Audio API
    this.frameSize = 128;
    // chunksPerSecond corresponds to how many messages we send to the main
    // thread each second and thus how many requests we send out over websocket
    // each second
    const chunksPerSecond = 4;
    const sampleRate = 44100;
    // Should be about 86, so buffering reduces our outgoing websocket packets
    // by ~100-fold
    this.framesPerChunk = Math.floor(sampleRate / chunksPerSecond / this.frameSize);
    this.framesInBuffer = 0;
    this.chunkBuffer = new Float32Array(this.framesPerChunk * this.frameSize);
  }

  process(inputs, outputs, parameters) {
    // We assume we only have one input connection
    const input = inputs[0];
    const output = outputs[0];

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

    return true;
  }
}

registerProcessor('RecordingProcessor', RecordingProcessor);
