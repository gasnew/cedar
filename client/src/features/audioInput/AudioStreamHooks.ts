import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useSelector } from 'react-redux';
import { Base64 } from 'js-base64';

import { IOutputDevice } from '../audioInput/audioSlice';
import { usePatch } from '../feathers/FeathersHooks';
import { selectLoopbackLatencyMs } from '../mediaBar/mediaBarSlice';
import createAudioDestinationNode from '../mixer/createAudioDestinationNode';
import {
  selectCurrentRecording,
  selectMyTrackId,
  selectRecordingState,
  selectRecordingDelaySeconds,
} from '../recording/recordingSlice';
import { selectAmInChain } from '../room/roomSlice';

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

type WorkletCallback = (event: MessageEvent) => void;
function useChunkPoster(
  trackId: string | null,
  setWorkletCallback: (WorkletCallback) => void
) {
  // TODO: Make robust to network failures
  const cursor = useRef<string | null>(null);
  const dataBuffer = useRef<string[]>([]);
  const requestOut = useRef<boolean>(false);
  const [patchTrack] = usePatch('tracks', '', {}, true);

  // Instantiate this once, and reuse it for different streams/tracks
  const opusWorker = useMemo(() => new Worker('webopus.asm.min.js'), []);

  useEffect(
    () => {
      const stream = `track-${trackId}`;
      cursor.current = null;
      dataBuffer.current = [];
      requestOut.current = false;

      // This onmessage function receives opus-encoded packets or opus/webopus
      // errors
      opusWorker.onmessage = async ({
        data: { error, packet, sampleRate },
      }) => {
        if (error) {
          console.error('webopus worker error: ', error);
          return;
        }
        // Sometimes we receive undefined packets at the end of a stream
        if (!packet) return;
        // Sometimes the worklet takes a moment to stop, even after we've
        // stopped recording
        if (!trackId) return;

        const data = Base64.fromUint8Array(packet);
        dataBuffer.current = dataBuffer.current.concat([data]);

        // WARNING--IMPORTANT CONDITIONAL AHEAD: We must not allow more than
        // one request to be out at a time to guarantee we always send complete
        // data in order, so we use requestOut to flag whether a request is in
        // progress
        if (!requestOut.current && dataBuffer.current.length > 3) {
          // This needs to be set to true before anything else
          requestOut.current = true;

          const dataToSend = dataBuffer.current;
          dataBuffer.current = [];
          const response = await patchTrack(trackId, {
            cursor: cursor.current,
            data: dataToSend,
          });

          if (response.data) {
            // If success, get ready for next request
            cursor.current = response.data.cursor;
          } else {
            // For now, data that failed to send will stay in the buffer, and
            // the cursor won't change, so we'll just try again in a sec.
            // TODO: In some cases, the request succeeds, but we get a failed
            // response, meaning we never update the cursor. We should update
            // the server thus:
            //- should update the patch endpoint to, if it receives data with the
            //  wrong cursor,
            //  * if the incoming data matches the data from that cursor
            //    onward, return the saved cursor with a 200 (truly idempotent,
            //    which is handy for when a server dies before responding)
            //  * if the incoming data does not match the data from that cursor
            //    onward, fail the request by saying something like, "The
            //    provided data is not contiguous with/adjacent to previous
            //    data"
            if (dataBuffer.current.length > 150) {
              console.error(
                'Resetting data buffer because it got too hecka long!'
              );
              dataBuffer.current = [];
            }
            console.error(
              `We just failed to send a large chunk of data. This is really
              bad!!`
            );
          }

          // This needs to be set to false after everything else
          requestOut.current = false;
        }
      };

      // NOTE(gnewman): Since webopus requires that we send data with the
      // initial message, we need to keep this boolean variable around to track
      // whether we've sent the initial message from our stream or not.
      var instantiatedStream = false;

      setWorkletCallback((event) => {
        if (!instantiatedStream) {
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
        }
      };
    },
    // We can ignore the patchTrack dependency because that one isn't dependent
    // on anything but roomId. This is a bit of a hack to get around using the
    // feathers client directly (which we could do instead).
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [trackId, opusWorker]
  );
}

interface DataResponse {
  canChangeStream: boolean;
  someData: boolean;
  fetchData: () => Uint8Array;
  setGainDB: (number) => void;
  setMonitoringInput: (boolean) => void;
}

export function useStreamData(
  stream: MediaStream | null,
  outputDevice: IOutputDevice | null
): DataResponse {
  const [analyzer, setAnalyzer] = useState<AnalyserNode | null>(null);
  const [gainNode, setGainNode] = useState<GainNode | null>(null);
  const [setMonitoringInput, setSetMonitoringInput] = useState<
    (boolean) => void
  >(() => (_) => null);
  const [dataArray, setDataArray] = useState<Uint8Array>(new Uint8Array());
  const [postWorkletMessage, setPostWorkletMessage] = useState<(any) => void>(
    (_) => (_) => null
  );
  const [canChangeStream, setCanChangeStream] = useState<boolean>(true);
  const [setWorkletCallback, setSetWorkletCallback] = useState<
    (WorkletCallback) => void
  >((_) => (_) => null);
  // Only used in race-condition protection
  const currentAudioContext = useRef<AudioContext | null>(null);
  useChunkPoster(useSelector(selectMyTrackId), setWorkletCallback);
  const recordingState = useSelector(selectRecordingState);
  const currentRecording = useSelector(selectCurrentRecording);
  const delaySeconds = useSelector(selectRecordingDelaySeconds);
  const loopbackLatencyMs = useSelector(selectLoopbackLatencyMs);
  const amInChain = useSelector(selectAmInChain);

  // Hook to start the worklet when recordingState says so. Starting the audio
  // worklet is idempotent, so it's OK if we send the message multiple times
  useEffect(() => {
    // Don't send audio to server if not in chain
    if (!amInChain) return;

    if (recordingState === 'recording' && currentRecording) {
      postWorkletMessage({
        action: 'start',
        // more negative -> delay mic more
        delaySeconds: delaySeconds + (loopbackLatencyMs || 0) / 1000,
        recordingStartedAt: currentRecording.startedAt,
      });
    } else if (recordingState === 'stopped') {
      postWorkletMessage({ action: 'stop' });
    }
  }, [
    amInChain,
    recordingState,
    postWorkletMessage,
    currentRecording,
    delaySeconds,
    loopbackLatencyMs,
  ]);

  useEffect(() => {
    if (!stream) setAnalyzer(null);
    else {
      const audioContext = new window.AudioContext({
        sampleRate: 48000,
      });
      // Store the current AudioContext for race condition protection
      currentAudioContext.current = audioContext;
      const updateStream = async () => {
        await audioContext.audioWorklet.addModule('AudioInputBufferer.js');
        const analyzer = audioContext.createAnalyser();
        const mediaSource = audioContext.createMediaStreamSource(stream);

        const inputGainNode = audioContext.createGain();
        const directToDestinationGainNode = audioContext.createGain();
        const audioInputBufferNode = new AudioWorkletNode(
          audioContext,
          'AudioInputBufferer'
        );

        mediaSource.connect(inputGainNode);
        inputGainNode.connect(analyzer);
        inputGainNode.connect(audioInputBufferNode);
        inputGainNode.connect(directToDestinationGainNode);
        // Just piped to destination here so the audio engine treats this
        // branch as active. No audio is rendered to the speakers.
        audioInputBufferNode.connect(audioContext.destination);

        // Set up monitoring
        const inputChannelMergerNode = audioContext.createChannelMerger(1);
        directToDestinationGainNode.connect(inputChannelMergerNode);
        const {
          audioDestinationNode,
          startAudioDestinationNode,
          stopAudioDestinationNode,
        } = await createAudioDestinationNode(audioContext);
        inputChannelMergerNode.connect(audioDestinationNode);

        // Has to be a power of 2. At the default sample rate of 48000, this
        // size should be enough to let us fetch all samples assuming we are
        // fetching every 1/60th of a second (48000 / 60 = 800 samples).
        analyzer.fftSize = 1024;
        inputGainNode.gain.value = 1;
        directToDestinationGainNode.gain.value = 0;

        // NOTE(gnewman): This check protects us from making state changes
        // using an outdated AudioContext. If the AudioContext of this
        // function call is not the same as currentAudioContext.current, that
        // means there is another in-progress call to this function that we
        // should yield to--i.e., return now before calling "set" commands.
        if (audioContext !== currentAudioContext.current) {
          console.log(
            `updateStream was called in quick succession. Ignoring setting data for the first call.`
          );
          return;
        }
        setSetWorkletCallback(
          () => (callback) => (audioInputBufferNode.port.onmessage = callback)
        );
        setAnalyzer(analyzer);
        setGainNode(inputGainNode);
        setSetMonitoringInput(() => (monitoring) => {
          directToDestinationGainNode.gain.value = monitoring ? 1 : 0;
          if (monitoring && outputDevice)
            startAudioDestinationNode({
              recordingStartedAt: Date.now(),
              deviceId: outputDevice.id,
            });
          else stopAudioDestinationNode();
        });
        setDataArray(new Uint8Array(analyzer.fftSize));
        setPostWorkletMessage(
          () => (message) => audioInputBufferNode.port.postMessage(message)
        );
      };

      const updateStreamPromise = updateStream();

      return () => {
        setCanChangeStream(false);
        // NOTE(gnewman): We need to wait until updateStream has finished
        // doing its thing before we can close the context. The promise
        // resolver will be fired immediately after `then` is called if the
        // promise is already fulfilled.
        updateStreamPromise.then(() => {
          audioContext.close().then(() => {
            setCanChangeStream(true);
          });
        });
      };
    }
  }, [stream, outputDevice]);

  const fetchData = useCallback(() => {
    if (analyzer) analyzer.getByteTimeDomainData(dataArray);
    return dataArray;
  }, [analyzer, dataArray]);
  const setGainDB = (gainDB) => {
    if (gainNode) gainNode.gain.value = Math.pow(10, gainDB / 20);
  };

  return {
    canChangeStream,
    someData: !!analyzer,
    fetchData,
    setGainDB,
    setMonitoringInput,
  };
}
