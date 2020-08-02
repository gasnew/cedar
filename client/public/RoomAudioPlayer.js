// WARNING(gnewman): Be *very* careful editing this file, as it is JS, not TS.

// TODO: Summarize the API and functionality of this module
class RoomAudioPlayer extends AudioWorkletProcessor {
  constructor() {
    super();

    // This is currently not configurable via Web Audio API
    this.frameSize = 128;

    // Buffer up to a whole minute of PCM data
    this.bufferLength = sampleRate * 60;
    this.bufferWriteIndex = 0;
    this.bufferReadIndex = 0;
    this.pcmBuffer = new Float32Array(this.bufferLength);

    this.onmessage = event => {
      const { type, pcm } = event.data;

      if (type === 'buffer') {
        // Append PCM data, and move buffer index (wrap if reached end)
        const dataLength = pcm.length;
        for (let i = 0; i < dataLength; i++)
          this.pcmBuffer[(this.bufferWriteIndex + i) % this.bufferLength] =
            pcm[i];
        this.bufferWriteIndex =
          (this.bufferWriteIndex + dataLength) % this.bufferLength;
      }
    };
  }

  process(inputs, outputs, parameters) {
    // We assume we only have one output connection
    const output = outputs[0];

    // We only support one channel right now
    const channel = output[0];
    for (let i = 0; i < this.frameSize; i++) {
      const readIndex = (this.bufferReadIndex + i) % this.bufferLength;
      channel[i] = this.pcmBuffer[readIndex];
      // We need to zero this out in case we've gone through the buffer once,
      // and we haven't received data for this part of the track yet. This is
      // likely to happen if another musician loses connection or has a spotty
      // connection, especially when they are close to you in the chain.
      this.pcmBuffer[readIndex] = 0;
    }
    this.bufferReadIndex =
      (this.bufferReadIndex + this.frameSize) % this.bufferLength;

    return true;
  }
}

registerProcessor('RoomAudioPlayer', RoomAudioPlayer);
