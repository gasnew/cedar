// WARNING(gnewman): Be *very* careful editing this file, as it is JS, not TS.

// TODO: Summarize the API and functionality of this module
class AudioDestinationNode extends AudioWorkletProcessor {
  constructor() {
    super();

    this.running = false;
    this.outputBuffer = new Uint32Array(48000 / 50);
    this.bufferIndex = 0;
    this.recordingStartedAt = 0;
    this.adjustedForDeadTime = false;

    this.port.onmessage = (event) => {
      if (event.data && event.data.action) {
        if (event.data.action === 'initialize') {
          // TODO: Think about what happens if there is a large gap between
          // this moment and starting collecting data
          this.running = true;
          this.bufferIndex = 0;
          this.recordingStartedAt = event.data.recordingStartedAt;
          this.adjustedForDeadTime = false;
        } else if (event.data.action === 'stop') {
          this.running = false;
        }
      }
    };
  }

  process(inputs, outputs, parameters) {
    if (!this.running || !inputs[0][0]) return true;
    if (!this.adjustedForDeadTime) {
      // NOTE(gnewman): We need to pad our output just after starting this node
      // to account for the audio samples we should have seen but didn't in the
      // time in took recording to start. We also add a few blank samples to
      // act as a buffer between the frontend (this node) and the
      // PortAudio-based audio backend.
      const samplesToAdd =
        48 * (Date.now() - this.recordingStartedAt) + 4800 * 1;
      for (let i = 0; i < samplesToAdd; i++) this.pushSample(0);
      this.adjustedForDeadTime = true;
    }

    for (let i = 0; i < 128; i++) {
      const value = inputs[0][0][i];
      const clamp = (v) => Math.max(-0x7fffffff, Math.min(0x7fffffff, v));
      if (value < 0) {
        this.pushSample(clamp(0x80000000 * value));
      } else {
        this.pushSample(clamp(0x7fffffff * value));
      }
    }

    return true;
  }

  pushSample(sample) {
    this.outputBuffer[this.bufferIndex] = sample;
    this.bufferIndex += 1;

    if (this.bufferIndex === this.outputBuffer.length) {
      this.port.postMessage(this.outputBuffer);
      this.bufferIndex = 0;
    }
  }
}

registerProcessor('AudioDestinationNode', AudioDestinationNode);
