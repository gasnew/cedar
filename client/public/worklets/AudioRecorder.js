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
    const maxSamplesToCapture = sampleRate * 5;
    this.recordedData = new Float32Array(maxSamplesToCapture);
    this.recording = false;
    this.recordedSamples = 0;
    this.samplesToCapture = 0;
    //this.startTimeMs = 0;

    this.port.onmessage = event => {
      if (event.data && event.data.action) {
        if (event.data.action === 'start') {
          if (this.recording) return;
          //this.startTimeMs = Date.now();
          this.recording = true;
          this.recordedSamples = 0;
          this.samplesToCapture = event.data.samplesToCapture;
          console.log(event.data.samplesToCapture);
        }
      }
    };
  }

  process(inputs, outputs, parameters) {
    if (!this.recording) return true;

    // We assume we only have one input connection
    const input = inputs[0];
    // We only support one channel right now
    const channel = input[0];

    //if (this.recordedSamples === 0) {
      //const samplesToAdd = (Date.now() - this.startTimeMs) * 48;
      //console.log(samplesToAdd);
      ////this.recordedSamples += samplesToAdd;
    //}

    for (let i = 0; i < this.frameSize; i++) {
      const index = this.recordedSamples
      this.recordedData[index] = channel[i];
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
