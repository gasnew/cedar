import _ from 'lodash';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useSelector } from 'react-redux';
import { decode } from 'js-base64';

import { useLazyFind } from '../feathers/FeathersHooks';
import {
  selectCurrentTracks,
  selectPrecedingTracks,
  selectRecordingState,
  selectRecordingDelaySeconds,
} from '../recording/recordingSlice';
import { useInterval } from '../../app/util';
import { Track as ServerTrack } from '../../../../api/src/room';

function useFetchAudioData(postWorkletMessage: (any) => void) {
  const [fetching, setFetching] = useState<boolean>(false);
  const [cursorsByTrack, setCursorsByTrack] = useState<{
    [trackId: string]: string | null;
  }>({});
  const recordingState = useSelector(selectRecordingState);
  const delaySeconds = useSelector(selectRecordingDelaySeconds);
  const precedingTracks = useSelector(selectPrecedingTracks);
  const [findTracks] = useLazyFind('tracks');

  // NOTE(gnewman): Since webopus requires that we send data with the initial
  // message, we need to keep this boolean ref around to track whether we've
  // sent the initial message from our stream or not.
  const instantiatedStreams = useRef<{ [trackId: string]: boolean }>({});

  // Instantiate this once, and reuse it for different streams/tracks
  const opusWorker = useMemo(() => new Worker('webopus.asm.min.js'), []);

  // Hook to initialize the worklet when recordingState says so. Use fetching
  // to make sure we don't call setCursorsByTrack multiple times for individual
  // recording events.
  useEffect(
    () => {
      if (recordingState === 'recording' && !fetching) {
        console.log('delay', delaySeconds);
        console.log(precedingTracks.length);
        postWorkletMessage({
          action: 'initialize',
          delaySeconds,
          trackCount: precedingTracks.length,
        });
        setFetching(true);
        setCursorsByTrack(
          _.reduce(
            precedingTracks,
            (cursorsByTrack, track) => ({
              ...cursorsByTrack,
              [track.id]: null,
            }),
            {}
          )
        );
      } else if (recordingState === 'stopped' && fetching) {
        postWorkletMessage({
          action: 'stop',
        });
        setFetching(false);
      }
    },
    [
      recordingState,
      postWorkletMessage,
      delaySeconds,
      precedingTracks,
      fetching,
    ]
  );

  // Wire the opusWorker to the audioWorklet
  useEffect(
    () => {
      opusWorker.onmessage = async ({ data: { error, stream, frames } }) => {
        // Sometimes we receive undefined packets at the end of a stream
        if (!frames) return;
        if (error) {
          console.error('webopus worker decoding error: ', error);
          return;
        }

        console.log(
          'stream index',
          _.findIndex(precedingTracks, ['id', stream])
        );
        postWorkletMessage({
          action: 'buffer',
          pcm: frames,
          pcmIndex: _.findIndex(precedingTracks, ['id', stream]),
        });
      };
    },
    [opusWorker, postWorkletMessage, precedingTracks]
  );

  // Fetch audio data, and post it to the opusWorker
  useEffect(
    () => {
      const streamName = trackId => trackId;

      if (!fetching && !_.isEmpty(instantiatedStreams.current)) {
        _.each(cursorsByTrack, (_, trackId) => {
          console.log('enddo', trackId);
          opusWorker.postMessage({
            op: 'end',
            stream: streamName(trackId),
          });
        });
        instantiatedStreams.current = {};
        return;
      }

      const retrieveTrackData = async () => {
        const { data, error } = await findTracks({ cursorsByTrack });
        // NOTE(gnewman): Need to do this because Feathers allows find to
        // return a single instance
        const tracks = data as ServerTrack[] | null;
        if (!tracks) {
          console.error(
            'Whoops! An error occurred while finding track data',
            error
          );
          return;
        }
        _.each(tracks, track => {
          // Don't even try to decode an empty array
          if (track.data.length === 0) return;

          const stream = streamName(track.id);
          if (!instantiatedStreams.current[track.id]) {
            console.log('begin tracko!!', track.id);
            opusWorker.postMessage({
              op: 'begin',
              stream,
              sampleRate: 48000,
              numChannels: 1,
              frames: decode(track.data[0]),
            });
            _.each(_.tail(track.data), packet =>
              opusWorker.postMessage({
                op: 'proc',
                stream,
                frames: decode(packet),
              })
            );
            instantiatedStreams.current[track.id] = true;
          } else {
            _.each(track.data, packet => {
              opusWorker.postMessage({
                op: 'proc',
                stream,
                frames: decode(packet),
              });
            });
          }
        });

        return tracks;
      };
      retrieveTrackData().then(tracks =>
        setCursorsByTrack(
          _.reduce(
            tracks,
            (cursorsByTrack, track) => ({
              ...cursorsByTrack,
              [track.id]: track.cursor,
            }),
            {}
          )
        )
      );
    },
    // We can ignore the findTracks dependency because that one isn't dependent
    // on anything but roomId. This is a bit of a hack to get around using the
    // feathers client directly (which we could do instead).
    // TODO: use the feathers client directly when we allow changing rooms
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [fetching, cursorsByTrack, opusWorker]
  );
}

interface DataResponse {
  someData: boolean;
  fetchData: () => Uint8Array;
  setGainDB: (number) => void;
}

export function useRoomAudio(): DataResponse {
  const [analyzer, setAnalyzer] = useState<AnalyserNode | null>(null);
  const [gainNode, setGainNode] = useState<GainNode | null>(null);
  const [dataArray, setDataArray] = useState<Uint8Array>(new Uint8Array());
  const [postWorkletMessage, setPostWorkletMessage] = useState<(any) => void>(
    () => _ => null
  );
  useFetchAudioData(postWorkletMessage);

  useEffect(() => {
    const audioContext = new window.AudioContext();
    const launchAudioNodes = async () => {
      await audioContext.audioWorklet.addModule('RoomAudioPlayer.js');
      const gainNode = audioContext.createGain();
      const analyzer = audioContext.createAnalyser();
      const roomAudioNode = new AudioWorkletNode(
        audioContext,
        'RoomAudioPlayer'
      );

      roomAudioNode.connect(gainNode);
      gainNode.connect(analyzer);
      gainNode.connect(audioContext.destination);

      // Has to be a power of 2. At the default sample rate of 48000, this
      // size should be enough to let us fetch all samples assuming we are
      // fetching every 1/60th of a second (48000 / 60 = 800 samples).
      analyzer.fftSize = 1024;
      gainNode.gain.value = 1;

      setAnalyzer(analyzer);
      setGainNode(gainNode);
      setDataArray(new Uint8Array(analyzer.fftSize));
      setPostWorkletMessage(() => message =>
        roomAudioNode.port.postMessage(message)
      );
    };
    launchAudioNodes();

    return () => {
      audioContext.close();
    };
  }, []);

  const fetchData = () => {
    if (analyzer) analyzer.getByteTimeDomainData(dataArray);
    return dataArray;
  };
  const setGainDB = gainDB => {
    if (gainNode) gainNode.gain.value = Math.pow(10, gainDB / 20);
  };

  return { someData: !!analyzer, fetchData, setGainDB };
}
