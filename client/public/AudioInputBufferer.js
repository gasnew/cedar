// WARNING(gnewman): Be *very* careful editing this file, as it is JS, not TS.
// Apparently TS doesn't support this yet, but we could think about adding
// these types someday:
// https://github.com/microsoft/TypeScript/issues/28308#issuecomment-650802278

//function readBinary(url) {
  //var xhr = new XMLHttpRequest();
  //xhr.open('GET', url, false);
  //xhr.responseType = 'arraybuffer';
  //xhr.send(null);
  //return new Uint8Array(xhr.response);
//}
//readBinary('opusscript_native_wasm.wasm');
//var asm2wasmImports = {
  //'f64-rem': function(x, y) {
    //return x % y;
  //},
  //debugger: function() {
    //debugger;
  //},
//};

//var info = {
  //env: env,
  //global: { NaN: NaN, Infinity: Infinity },
  //'global.Math': Math,
  //asm2wasm: asm2wasmImports,
//};

//module = new WebAssembly.Module(binary);
//instance = new WebAssembly.Instance(module, info);
//console.log(instance);

//const thing = WebAssembly.instantiateStreaming(fetch('opusscript_native_wasm.wasm'))
//console.log(thing);
//https://github.com/srikumarks/webopus
//https://blog.scottlogic.com/2019/06/14/add-webassembly-to-react-app.html
//import thing from './opusscript_native_nasm';
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

registerProcessor('AudioInputBufferer', AudioInputBufferer);
