import { useCallback, useEffect, useRef, useState } from 'react';

import { usePatch } from '../feathers/FeathersHooks';

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
          },
        })
        .then(setStream);
  }, [deviceId]);

  return stream;
}

function useChunkPoster(trackId: string): (event: MessageEvent) => void {
  // TODO: Make robust to network failures
  // TODO: Make robust to requests taking longer than 0.25 seconds (4
  // chunks/sec)
  const cursor = useRef<string | null>('1595793133751-0');
  const dataBuffer = useRef<string[]>([]);
  const requestOut = useRef<boolean>(false);
  const [patchTrack] = usePatch('tracks');

  return useCallback(
    async event => {
      const data = 'haha';
      dataBuffer.current = dataBuffer.current.concat([data]);

      // Only one request can be out at a time to guarantee we always send
      // complete data in order
      if (!requestOut.current) {
        // This needs to be set to true before anything else
        requestOut.current = true;
        const dataToSend = dataBuffer.current;
        console.log('cursor', cursor.current, 'data', dataBuffer.current);
        const response = await patchTrack(trackId, {
          cursor: cursor.current,
          data: dataToSend,
        });
        if (response.data) {
          // If success, get ready for next request
          dataBuffer.current = [];
          cursor.current = response.data.cursor;
        } else {
          console.error('WHOAT THERE', response.error);
          // For now, data that failed to send will stay in the buffer, and
          // the cursor won't change, so we'll just try again in a sec.
          // TODO: In some cases, the request succeeds, but we get a failed
          // response, meaning we never update the cursor. We should
          // theoretically be able to recover by attempting to fetch the track
          // data we already sent with our current stale cursor. If we get back
          // the exact data we sent, then we can clear the buffer and update
          // our cursor.
          if (dataBuffer.current.length > 50) {
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
        await audioContext.audioWorklet.addModule('RecordingProcessor.js');
        const analyzer = audioContext.createAnalyser();
        const mediaSource = audioContext.createMediaStreamSource(stream);
        const gainNode = audioContext.createGain();
        const recordingNode = new AudioWorkletNode(
          audioContext,
          'RecordingProcessor'
        );
        recordingNode.port.onmessage = postChunk;

        mediaSource.connect(gainNode);
        gainNode.connect(analyzer);
        gainNode.connect(recordingNode);
        recordingNode.connect(audioContext.destination);

        // Has to be a power of 2. At the default sample rate of 44100, this size
        // should be enough to let us fetch all samples assuming we are fetching
        // every 1/60th of a second (44100 / 60 = 735 samples).
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
