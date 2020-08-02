import _ from 'lodash';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

import { usePatch } from '../feathers/FeathersHooks';
const opusscript = require('opusscript');

interface Props {
  deviceId: string | null;
  gainDB: number;
}

export function useStream(deviceId: string | null) {
  const [stream, setStream] = useState<MediaStream | null>(null);

  useEffect(() => {
    if (!deviceId) setStream(null);
    else
      navigator.mediaDevices
        .getUserMedia({
          audio: {
            deviceId: { exact: deviceId },
            autoGainControl: false,
            echoCancellation: false,
            noiseSuppression: false,
            sampleRate: 48000,
          },
        })
        .then(setStream);
  }, [deviceId]);

  return stream;
}

//const thing = WebAssembly.instantiateStreaming(fetch('opusscript_native_wasm.wasm'))
//console.log(thing);
function useChunkPoster(trackId: string): (event: MessageEvent) => void {
  // TODO: Make robust to network failures
  const cursor = useRef<string | null>('1595794880336-0');
  const dataBuffer = useRef<string[]>([]);
  const requestOut = useRef<boolean>(false);
  const [patchTrack] = usePatch('tracks');

  // TODO: Please, oh please, use wasm
  // TODO: Also, move encoding/decoding into a web worker--maybe using webopus
  const encoder = useMemo(
    () =>
      new opusscript(48000, 1, opusscript.Application.AUDIO, { wasm: false }),
    []
  );

  useEffect(
    () => () => {
      console.log('clean up opus');
      encoder.delete();
    },
    []
  );

  return useCallback(
    async event => {
      // 48kHz sampling rate, 20ms frame duration, stereo audio (2 channels)
      //var samplingRate = 48000;
      //var frameDuration = 20;
      //var channels = 1;
      //var frameSize = (samplingRate * frameDuration) / 1000;
      //var pcmData = event.data;
      //var pcmData = new Buffer(pcmSource);
      //console.log(event.data);
      //var encodedPacket = encoder.encode(pcmData, frameSize);
      //console.log(encodedPacket);

      //// Decode the opus packet back into PCM
      //var decodedPacket = encoder.decode(encodedPacket);

      const data = _.join(
        _.map(_.range(10), idx => _.sample(['A', 'T', 'C', 'G'])),
        ''
      );
      dataBuffer.current = dataBuffer.current.concat([data]);

      // Only one request can be out at a time to guarantee we always send
      // complete data in order
      if (!requestOut.current) {
        // This needs to be set to true before anything else
        requestOut.current = true;
        const dataToSend = dataBuffer.current;
        //console.log('cursor', cursor.current, 'data', dataBuffer.current);
        const response = await patchTrack(trackId, {
          cursor: cursor.current,
          data: dataToSend,
        });
        if (response.data) {
          // If success, get ready for next request
          dataBuffer.current = [];
          cursor.current = response.data.cursor;
        } else {
          //console.error('WHOAT THERE', response.error);
          // For now, data that failed to send will stay in the buffer, and
          // the cursor won't change, so we'll just try again in a sec.
          // TODO: In some cases, the request succeeds, but we get a failed
          // response, meaning we never update the cursor. We should update the server thus:
          //- should update the patch endpoint to, if it receives data with the
          //  wrong cursor,
          //  * if the incoming data matches the data from that cursor onward,
          //    return the saved cursor with a 200 (truly idempotent, which is
          //    handy for when a server dies before responding)
          //  * if the incoming data does not match the data from that cursor
          //    onward, fail the request by saying something like, "The provided
          //    data is not contiguous with/adjacent to previous data"
          if (dataBuffer.current.length > 150) {
            console.error(
              'Resetting data buffer because it got too hecka long!'
            );
            dataBuffer.current = [];
          }
        }
        // This needs to be set to false after everything else
        requestOut.current = false;
      }
    },
    // We can ignore the patchTrack dependency because that one isn't dependent
    // on anything but roomId. This is a bit of a hack to get around using the
    // feathers client directly (which we could do instead).
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [trackId]
  );
}

interface DataResponse {
  someData: boolean;
  fetchData: () => Uint8Array;
  setGainDB: (number) => void;
}

export function useStreamData(stream: MediaStream | null): DataResponse {
  const [analyzer, setAnalyzer] = useState<AnalyserNode | null>(null);
  const [gainNode, setGainNode] = useState<GainNode | null>(null);
  const [dataArray, setDataArray] = useState<Uint8Array>(new Uint8Array());
  const postChunk = useChunkPoster('08fe2ee7-dce7-42d8-8ee9-c75a1e11929f');

  useEffect(() => {
    if (!stream) setAnalyzer(null);
    else {
      const updateStream = async () => {
        const audioContext = new window.AudioContext();
        await audioContext.audioWorklet.addModule('AudioInputBufferer.js');
        const analyzer = audioContext.createAnalyser();
        const mediaSource = audioContext.createMediaStreamSource(stream);
        const gainNode = audioContext.createGain();
        const audioInputBufferNode = new AudioWorkletNode(
          audioContext,
          'AudioInputBufferer'
        );
        audioInputBufferNode.port.onmessage = postChunk;

        mediaSource.connect(gainNode);
        gainNode.connect(analyzer);
        gainNode.connect(audioInputBufferNode);
        audioInputBufferNode.connect(audioContext.destination);

        // Has to be a power of 2. At the default sample rate of 48000, this
        // size should be enough to let us fetch all samples assuming we are
        // fetching every 1/60th of a second (48000 / 60 = 800 samples).
        analyzer.fftSize = 1024;
        gainNode.gain.value = 1;

        setAnalyzer(analyzer);
        setGainNode(gainNode);
        setDataArray(new Uint8Array(analyzer.fftSize));
      };
      updateStream();
    }
  }, [postChunk, stream]);

  const fetchData = () => {
    if (analyzer) analyzer.getByteTimeDomainData(dataArray);
    return dataArray;
  };
  const setGainDB = gainDB => {
    if (gainNode) gainNode.gain.value = Math.pow(10, gainDB / 20);
  };

  return { someData: !!analyzer, fetchData, setGainDB };
}
