import _ from 'lodash';
import { useEffect, useMemo, useRef, useState } from 'react';
import { useSelector } from 'react-redux';
import { Base64 } from 'js-base64';

import createAudioDestinationNode from './createAudioDestinationNode';
import { useLazyFind } from '../feathers/FeathersHooks';
import {
  selectCurrentRecording,
  selectPrecedingTracks,
  selectRecordingState,
  selectRecordingDelaySeconds,
} from '../recording/recordingSlice';
import { selectAmInChain } from '../room/roomSlice';
import { useInterval } from '../../app/util';
import { Track as ServerTrack } from '../../../../api/src/room';

declare global {
  interface HTMLAudioElement {
    setSinkId: (string) => Promise<undefined>;
  }
}

interface AudioDestinationControls {
  startAudioDestinationNode: ({ recordingStartedAt, deviceId }) => void;
  stopAudioDestinationNode: () => void;
}

function useFetchAudioData(
  postWorkletMessage: (any) => void,
  audioDestinationControls: AudioDestinationControls,
  deviceId: string,
) {
  const [fetching, setFetching] = useState<boolean>(false);
  const cursorsByTrack = useRef<{
    [trackId: string]: string | null;
  }>({});
  const recordingState = useSelector(selectRecordingState);
  const currentRecording = useSelector(selectCurrentRecording);
  const delaySeconds = useSelector(selectRecordingDelaySeconds);
  const precedingTracks = useSelector(selectPrecedingTracks);
  const amInChain = useSelector(selectAmInChain);
  const [findTracks] = useLazyFind('tracks');

  // NOTE(gnewman): Since webopus requires that we send data with the initial
  // message, we need to keep this boolean ref around to track whether we've
  // sent the initial message from our stream or not.
  const instantiatedStreams = useRef<{ [trackId: string]: boolean }>({});

  const requestOut = useRef<boolean>(false);

  // Instantiate this once, and reuse it for different streams/tracks
  const opusWorker = useMemo(() => new Worker('webopus.asm.min.js'), []);

  // Hook to initialize the worklet when recordingState says so. Use fetching
  // to make sure we don't call setCursorsByTrack multiple times for individual
  // recording events.
  useEffect(() => {
    // Don't play room audio if not in chain
    if (!amInChain) return;

    if (recordingState === 'recording' && !fetching && currentRecording) {
      postWorkletMessage({
        action: 'initialize',
        // more positive -> delay mic more
        delaySeconds: delaySeconds,
        trackCount: precedingTracks.length,
        recordingStartedAt: currentRecording.startedAt,
      });
      audioDestinationControls.startAudioDestinationNode({
        recordingStartedAt: currentRecording.startedAt,
        deviceId,
      });

      requestOut.current = false;
      setFetching(true);
      cursorsByTrack.current = _.reduce(
        precedingTracks,
        (cursorsByTrack, track) => ({
          ...cursorsByTrack,
          [track.id]: null,
        }),
        {}
      );
    } else if (recordingState === 'stopped' && fetching) {
      postWorkletMessage({
        action: 'stop',
      });
      audioDestinationControls.stopAudioDestinationNode();
      setFetching(false);
    }
  }, [
    amInChain,
    recordingState,
    postWorkletMessage,
    audioDestinationControls,
    delaySeconds,
    currentRecording,
    precedingTracks,
    fetching,
    deviceId,
  ]);

  // Wire the opusWorker to the audioWorklet
  useEffect(() => {
    opusWorker.onmessage = async ({
      data: { error, stream, frames, sampleRate },
    }) => {
      // Sometimes we receive undefined packets at the end of a stream
      if (error) {
        console.error('webopus worker decoding error: ', error);
        return;
      }
      if (!frames) return;

      postWorkletMessage({
        action: 'buffer',
        pcm: frames,
        pcmIndex: _.findIndex(precedingTracks, ['id', stream]),
      });
    };
  }, [opusWorker, postWorkletMessage, precedingTracks]);

  useEffect(() => {
    if (!fetching && !_.isEmpty(instantiatedStreams.current)) {
      _.each(cursorsByTrack.current, (_, trackId) => {
        opusWorker.postMessage({
          op: 'end',
          stream: trackId,
        });
      });
      instantiatedStreams.current = {};
    }
  }, [fetching, opusWorker]);

  // Fetch audio data, and post it to the opusWorker
  useInterval(() => {
    // We only want one request out at a time
    if (!fetching || requestOut.current) return;
    requestOut.current = true;

    const streamName = (trackId) => trackId;

    const retrieveTrackData = async () => {
      const { data, error } = await findTracks({
        cursorsByTrack: cursorsByTrack.current,
      });
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
      _.each(tracks, (track) => {
        // Don't even try to decode an empty array
        if (track.data.length === 0) return;

        const stream = streamName(track.id);
        if (!instantiatedStreams.current[track.id]) {
          opusWorker.postMessage({
            op: 'begin',
            stream,
            sampleRate: 48000,
            numChannels: 1,
            packet: Base64.toUint8Array(track.data[0]),
          });
          _.each(_.tail(track.data), (packet) =>
            opusWorker.postMessage({
              op: 'proc',
              stream,
              packet: Base64.toUint8Array(packet),
            })
          );
          instantiatedStreams.current[track.id] = true;
        } else {
          _.each(track.data, (packet) => {
            opusWorker.postMessage({
              op: 'proc',
              stream,
              packet: Base64.toUint8Array(packet),
            });
          });
        }
      });

      return tracks;
    };
    retrieveTrackData().then((tracks) => {
      cursorsByTrack.current = _.reduce(
        tracks,
        (cursorsByTrack, track) => ({
          ...cursorsByTrack,
          [track.id]: track.cursor,
        }),
        {}
      );
      requestOut.current = false;
    });
  }, 80);
}

export interface TrackControls {
  fetchData: () => Uint8Array;
  setGainDB: (number) => void;
}

function createControls(
  gainNode: GainNode,
  analyzer: AnalyserNode
): TrackControls {
  const dataArray = new Uint8Array(analyzer.fftSize);

  return {
    fetchData: () => {
      analyzer.getByteTimeDomainData(dataArray);
      return dataArray;
    },
    setGainDB: (gainDB) => {
      if (gainNode) gainNode.gain.value = Math.pow(10, gainDB / 20);
    },
  };
}

interface DataResponse {
  masterControls: TrackControls | null;
  trackControls: TrackControls[];
}

export function useRoomAudio(
  trackCount: number,
  deviceId: string
): DataResponse {
  const [masterControls, setMasterControls] = useState<TrackControls | null>(
    null
  );
  const [trackControls, setTrackControls] = useState<TrackControls[]>([]);
  const [postWorkletMessage, setPostWorkletMessage] = useState<(any) => void>(
    () => (_) => null
  );
  const [
    audioDestinationControls,
    setAudioDestinationControls,
  ] = useState<AudioDestinationControls>(() => ({
    startAudioDestinationNode: () => null,
    stopAudioDestinationNode: () => null,
  }));
  // Only used in race-condition protection
  const currentAudioContext = useRef<AudioContext | null>(null);

  useFetchAudioData(postWorkletMessage, audioDestinationControls, deviceId);

  useEffect(() => {
    const audioContext = new window.AudioContext({ sampleRate: 48000 });
    // Store the current AudioContext for race condition protection
    currentAudioContext.current = audioContext;
    const launchAudioNodes = async () => {
      await audioContext.audioWorklet.addModule('RoomAudioPlayer.js');
      const masterGainNode = audioContext.createGain();
      const masterAnalyzer = audioContext.createAnalyser();
      const roomAudioNode = new AudioWorkletNode(
        audioContext,
        'RoomAudioPlayer',
        {
          // 1 output minimum so we can at least analyze zeroes coming
          // through
          numberOfOutputs: trackCount || 1,
        }
      );

      const trackControls =
        trackCount === 0
          ? []
          : _.map(_.range(trackCount), (index) => {
              const trackGainNode = audioContext.createGain();
              const trackAnalyzer = audioContext.createAnalyser();

              roomAudioNode.connect(trackGainNode, index, 0);
              trackGainNode.connect(trackAnalyzer);
              trackGainNode.connect(masterGainNode, 0, 0);

              return createControls(trackGainNode, trackAnalyzer);
            });
      if (trackControls.length === 0) roomAudioNode.connect(masterGainNode);
      masterGainNode.connect(masterAnalyzer);

      const {
        audioDestinationNode,
        ...audioDestinationControls
      } = await createAudioDestinationNode(audioContext);

      masterGainNode.connect(audioDestinationNode);

      // Has to be a power of 2. At the default sample rate of 48000, this
      // size should be enough to let us fetch all samples assuming we are
      // fetching every 1/60th of a second (48000 / 60 = 800 samples).
      masterAnalyzer.fftSize = 1024;
      masterGainNode.gain.value = 1;

      // NOTE(gnewman): This check protects us from making state changes
      // using an outdated AudioContext. If the AudioContext of this function
      // call is not the same as currentAudioContext.current, that means
      // there is another in-progress call to this function that we should
      // yield to--i.e., return now before calling "set" commands.
      if (audioContext !== currentAudioContext.current) {
        console.log(
          `launchAudioNodes was called in quick succession. Ignoring setting data for the first call.`
        );
        return;
      }
      setTrackControls(trackControls);
      setMasterControls(createControls(masterGainNode, masterAnalyzer));
      setPostWorkletMessage(() => (message) =>
        roomAudioNode.port.postMessage(message)
      );
      setAudioDestinationControls(audioDestinationControls);

      return;
    };
    const launchAudioNodesPromise = launchAudioNodes();

    return () => {
      // NOTE(gnewman): We need to wait until launchAudioNodes has finished
      // doing its thing before we can close the context. The promise
      // resolver will be fired immediately after `then` is called if the
      // promise is already fulfilled.
      launchAudioNodesPromise.then(() => {
        audioContext.close();
      });
    };
  }, [trackCount, deviceId]);

  return { masterControls, trackControls };
}
