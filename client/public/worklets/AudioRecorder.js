// WARNING(gnewman): Be *very* careful editing this file, as it is JS, not TS.
// Apparently TS doesn't support this yet, but we could think about adding
// these types someday:
// https://github.com/microsoft/TypeScript/issues/28308#issuecomment-650802278

class AudioRecorder extends AudioWorkletProcessor {
  constructor() {
    super();

    // This is currently not configurable via Web Audio API
    this.frameSize = 128;

    const sampleRate = 48000;
    const maxSamplesToCapture = sampleRate * 20;
    this.recordedData = new Float32Array(maxSamplesToCapture);
    this.recording = false;
    this.recordedSamples = 0;
    this.samplesToCapture = 0;

    this.port.onmessage = event => {
      if (event.data && event.data.action) {
        if (event.data.action === 'start') {
          if (this.recording) return;
          this.recording = true;
          this.recordedSamples = 0;
          this.samplesToCapture = event.data.samplesToCapture;
          this.recordingStartedAt = event.data.recordingStartedAt;
        }
      }
    };
  }

  process(inputs, outputs, parameters) {
    if (!this.recording) return true;
    if (this.recordedSamples === 0) {
      // NOTE(gnewman): Recording may start at a different time than
      // playback, so let's account for any time that's elapsed since
      // playback began by padding our recording data.
      this.recordedSamples = (Date.now() - this.recordingStartedAt) * 48;
      console.log(`Ignoring ${this.recordedSamples / 48} ms`);
    }

    // We assume we only have one input connection
    const input = inputs[0];

    for (let i = 0; i < this.frameSize; i++) {
      const index = this.recordedSamples;
      this.recordedData[index] = 0;
      // Add all channels into recordedData
      for (let j = 0; j < input.length; j++)
        this.recordedData[index] += input[j][i];

      if (index === this.samplesToCapture - 1) {
        this.port.postMessage(this.recordedData);
        this.recording = false;
      }

      this.recordedSamples += 1;
    }

    return true;
  }
}

registerProcessor('AudioRecorder', AudioRecorder);
