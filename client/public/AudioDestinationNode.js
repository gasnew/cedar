// WARNING(gnewman): Be *very* careful editing this file, as it is JS, not TS.

// TODO: Summarize the API and functionality of this module
class AudioDestinationNode extends AudioWorkletProcessor {
  constructor() {
    super();

    this.running = false;
    //this.outputBuffer = new Float32Array(48000 * 1);
    this.outputBuffer = new Uint32Array(48000 * 1);
    this.bufferIndex = 0;

    this.port.onmessage = (event) => {
      if (event.data && event.data.action) {
        if (event.data.action === 'initialize') {
          // TODO: Think about what happens if there is a large gap between
          // this moment and starting collecting data
          this.running = true;
          this.bufferIndex = 0;
        } else if (event.data.action === 'stop') {
          this.running = false;
        }
      }
    };
  }

  process(inputs, outputs, parameters) {
    if (!this.running) return true;

    for (let i = 0; i < 128; i++) {
      const value = inputs[0][0][i];
      //this.outputBuffer[this.bufferIndex + i] = ;

      //const clamp = (value) => Math.max(0, Math.min(0xffffffff, value));
      //this.outputBuffer[this.bufferIndex + i] = clamp((value + 1) * 0x80000000);
      const clamp = (value) => Math.max(-0x7FFFFFFF, Math.min(0x7FFFFFFF, value))
      if (value < 0) {
          this.outputBuffer[this.bufferIndex + i] = clamp(0x80000000 * value);
      } else {
          this.outputBuffer[this.bufferIndex + i] = clamp(0x7FFFFFFF * value);
      }
    }
    this.bufferIndex += 128;
    if (this.bufferIndex === this.outputBuffer.length) {
      this.port.postMessage(this.outputBuffer);
      this.bufferIndex = 0;
    }

    return true;
  }
}

registerProcessor('AudioDestinationNode', AudioDestinationNode);
