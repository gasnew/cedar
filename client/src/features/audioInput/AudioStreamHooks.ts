import _ from 'lodash';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useSelector } from 'react-redux';
import { encode } from 'js-base64';

import { usePatch } from '../feathers/FeathersHooks';
import {
  selectMyTrackId,
  selectRecordingState,
  selectRecordingDelaySeconds,
} from '../recording/recordingSlice';

interface Props {
  deviceId: string | null;
  gainDB: number;
}

export function useStream(deviceId: string | null) {
  const [stream, setStream] = useState<MediaStream | null>(null);

  useEffect(
    () => {
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
    },
    [deviceId]
  );

  return stream;
}

function useChunkPoster(trackId: string | null): (event: MessageEvent) => void {
  // TODO: Make robust to network failures
  const cursor = useRef<string | null>(null);
  const dataBuffer = useRef<string[]>([]);
  const requestOut = useRef<boolean>(false);
  const [patchTrack] = usePatch('tracks');
  const [postChunk, setPostChunk] = useState<(event: MessageEvent) => void>(
    _ => null
  );

  // Instantiate this once, and reuse it for different streams/tracks
  const opusWorker = useMemo(() => new Worker('webopus.asm.min.js'), []);

  useEffect(
    () => {
      const stream = `track-${trackId}`;

      // This onmessage function receives opus-encoded packets or opus/webopus
      // errors
      opusWorker.onmessage = async ({ data: { error, packet } }) => {
        // Sometimes we receive undefined packets at the end of a stream
        if (!packet) return;
        // Sometimes the worklet takes a moment to stop, even after we've
        // stopped recording
        if (!trackId) return;
        if (error) {
          console.error('webopus worker error: ', error);
          return;
        }

        const data = encode(packet);
        dataBuffer.current = dataBuffer.current.concat([data]);

        // WARNING--IMPORTANT CONDITIONAL AHEAD: We must not allow more than
        // one request to be out at a time to guarantee we always send complete
        // data in order, so we use requestOut to flag whether a request is in
        // progress
        if (!requestOut.current) {
          // This needs to be set to true before anything else
          requestOut.current = true;

          const response = await patchTrack(trackId, {
            cursor: cursor.current,
            data: dataBuffer.current,
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
      };

      // NOTE(gnewman): Since webopus requires that we send data with the
      // initial message, we need to keep this boolean variable around to track
      // whether we've sent the initial message from our stream or not.
      var instantiatedStream = false;

      setPostChunk(() => event => {
        if (!instantiatedStream) {
          console.log('encode!');
          opusWorker.postMessage({
            op: 'begin',
            stream,
            sampleRate: 48000,
            numChannels: 1,
            frames: event.data,
          });
          instantiatedStream = true;
        } else
          opusWorker.postMessage({
            op: 'proc',
            stream,
            frames: event.data,
          });
      });

      return () => {
        if (instantiatedStream) {
          opusWorker.postMessage({
            op: 'end',
            stream,
          });
          instantiatedStream = false;
          cursor.current = null;
        }
      };
    },
    // We can ignore the patchTrack dependency because that one isn't dependent
    // on anything but roomId. This is a bit of a hack to get around using the
    // feathers client directly (which we could do instead).
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [trackId, opusWorker]
  );

  return postChunk;
}

interface DataResponse {
  canChangeStream: boolean;
  someData: boolean;
  fetchData: () => Uint8Array;
  setGainDB: (number) => void;
}

export function useStreamData(stream: MediaStream | null): DataResponse {
  const [analyzer, setAnalyzer] = useState<AnalyserNode | null>(null);
  const [gainNode, setGainNode] = useState<GainNode | null>(null);
  const [dataArray, setDataArray] = useState<Uint8Array>(new Uint8Array());
  const [postWorkletMessage, setPostWorkletMessage] = useState<(any) => void>(
    _ => null
  );
  const [canChangeStream, setCanChangeStream] = useState<boolean>(true);
  const postChunk = useChunkPoster(useSelector(selectMyTrackId));
  const recordingState = useSelector(selectRecordingState);
  const delaySeconds = useSelector(selectRecordingDelaySeconds);

  // Hook to start the worklet when recordingState says so. Starting the audio
  // worklet is idempotent, so it's OK if send the message multiple times
  useEffect(
    () => {
      if (recordingState === 'recording') {
        console.log('staht!');
        postWorkletMessage({
          action: 'start',
          delaySeconds,
        });
      }
    },
    [recordingState, postWorkletMessage, delaySeconds]
  );

  useEffect(
    () => {
      if (!stream) setAnalyzer(null);
      else {
        const audioContext = new window.AudioContext();
        const updateStream = async () => {
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
          setPostWorkletMessage(() => message =>
            audioInputBufferNode.port.postMessage(message)
          );
        };

        updateStream();

        return () => {
          setCanChangeStream(false);
          audioContext.close().then(() => {
            setCanChangeStream(true);
          });
        };
      }
    },
    [postChunk, stream]
  );

  const fetchData = () => {
    if (analyzer) analyzer.getByteTimeDomainData(dataArray);
    return dataArray;
  };
  const setGainDB = gainDB => {
    if (gainNode) gainNode.gain.value = Math.pow(10, gainDB / 20);
  };

  return { canChangeStream, someData: !!analyzer, fetchData, setGainDB };
}
