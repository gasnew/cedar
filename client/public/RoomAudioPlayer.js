// WARNING(gnewman): Be *very* careful editing this file, as it is JS, not TS.

// TODO: Summarize the API and functionality of this module
class RoomAudioPlayer extends AudioWorkletProcessor {
  constructor() {
    super();

    // This is currently not configurable via Web Audio API
    this.frameSize = 128;

    // Buffer up to a whole minute of PCM data
    const sampleRate = 48000;
    this.bufferLength = sampleRate * 60;
    this.pcmBuffers = [];
    this.bufferWriteIndices = [];
    this.bufferReadIndex = 0;

    this.onmessage = event => {
      if (event.data && event.data.action) {
        if (event.data.action === 'initialize') {
          // Initialize buffers and write indices, and set delay
          const { delaySeconds, trackCount } = event.data;
          this.pcmBuffers = new Array(trackCount);
          this.bufferWriteIndices = new Array(trackCount);
          for (let i = 0; i < this.pcmBuffers.length; i++) {
            this.pcmBuffers[i] = new Float32Array(this.bufferLength);
            this.bufferWriteIndices[i] = 0;
          }
          this.delaySamples = Math.floor(sampleRate * delaySeconds);
          this.bufferReadIndex = 0;
        } else if (event.data.action === 'buffer') {
          // Append data to buffers, assuming stream data always comes in in
          // the same order
          const { pcm, pcmIndex } = event.data;

          //for (let pcmIndex = 0; pcmIndex < pcmStreams.length; pcmIndex++) {
          // Append PCM data
          const stream = pcmStreams[pcmIndex];
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
          //}
        } else if (event.data.action === 'stop') {
          // Clear buffers
          for (let i = 0; i < this.pcmBuffers.length; i++) {
            this.pcmBuffers[i] = new Float32Array(this.bufferLength);
            this.bufferWriteIndices[i] = 0;
          }
        }
      }
    };
  }

  process(inputs, outputs, parameters) {
    // We assume we only have one output connection
    const output = outputs[0];

    // We only support one channel right now
    const channel = output[0];

    const bufferCount = this.pcmBuffers.length;
    for (let frameIndex = 0; frameIndex < this.frameSize; frameIndex++) {
      const readIndex = (this.bufferReadIndex + frameIndex) % this.bufferLength;
      for (let pcmIndex = 0; pcmIndex < bufferCount; pcmIndex++) {
        channel[i] += this.pcmBuffers[pcmIndex][readIndex];
        // We need to zero this out in case we've gone through the buffer once,
        // and we haven't received data for this part of the track yet. This is
        // likely to happen if another musician loses connection or has a spotty
        // connection, especially when they are close to you in the chain.
        this.pcmBuffers[pcmIndex][readIndex] = 0;
      }
    }
    this.bufferReadIndex =
      (this.bufferReadIndex + this.frameSize) % this.bufferLength;

    return true;
  }
}

registerProcessor('RoomAudioPlayer', RoomAudioPlayer);
