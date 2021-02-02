import _ from 'lodash';
import React, { useCallback, useEffect, useMemo, useRef } from 'react';
import { useSelector } from 'react-redux';
import { Colors } from '@blueprintjs/core';

import { Track as ServerTrack } from '../../../../api/src/room';
import { useInterval } from '../../app/util';
import { Canvas } from '../audioInput/VolumeBar';
import { useLazyFind } from '../feathers/FeathersHooks';
import { selectCurrentTracks } from '../recording/recordingSlice';

// Define a BufferHealthDataHandler interface that lets us pass data into
// BufferHealthDisplays without going through React's (relatively) slow
// rendering pipeline.
interface BufferHealthDataHandler {
  pushData: (bufferHealthSeconds: number[]) => void;
}
function createBufferHealthDataHandler(): BufferHealthDataHandler {
  return {
    pushData: bufferHealthSeconds => null,
  };
}

interface BufferHealthDataHandlersByMusicianId {
  [musicianId: string]: BufferHealthDataHandler;
}
/**
 * Return BufferHealthDataHandlers mapped by musician ID. Each buffer will be
 * regularly fed new buffer health data.
 */
export function useBufferHealthData(
  enabled: boolean
): BufferHealthDataHandlersByMusicianId {
  const currentTracks = useSelector(selectCurrentTracks);
  const requestOut = useRef<boolean>(false);
  const cursorsByTrack = useRef<{
    [trackId: string]: string | null;
  }>({});
  const [findTrackBufferHealthData] = useLazyFind('trackBufferHealth');
  const bufferHealthDataHandlersByMusicianId = useMemo<
    BufferHealthDataHandlersByMusicianId
  >(
    () =>
      _.flow(
        currentTracks => _.keyBy(currentTracks, 'musicianId'),
        tracksByMusicianId =>
          _.mapValues(tracksByMusicianId, () => createBufferHealthDataHandler())
      )(currentTracks),
    [currentTracks]
  );

  useEffect(
    () => {
      if (enabled) {
        // Init fetching
        requestOut.current = false;
        cursorsByTrack.current = _.reduce(
          currentTracks,
          (cursorsByTrack, track) => ({
            ...cursorsByTrack,
            [track.id]: null,
          }),
          {}
        );
      }
    },
    [currentTracks, enabled]
  );

  // Fetch audio data, and post it to the opusWorker
  useInterval(() => {
    // We only want one request out at a time
    if (!enabled || requestOut.current) return;
    requestOut.current = true;

    const retrieveBufferHealthData = async () => {
      const { data, error } = await findTrackBufferHealthData({
        cursorsByTrack: cursorsByTrack.current,
      });
      // NOTE(gnewman): Need to do this because Feathers allows find to
      // return a single instance
      const tracks = data as ServerTrack[] | null;
      if (!tracks) {
        console.error(
          'Whoops! An error occurred while finding buffer health data',
          error
        );
        return;
      }
      _.each(tracks, track => {
        // Don't even try to decode an empty array
        if (track.bufferHealthSeconds.length === 0) return;

        const handler = bufferHealthDataHandlersByMusicianId[track.musicianId];
        handler.pushData(track.bufferHealthSeconds);
      });

      return tracks;
    };
    retrieveBufferHealthData().then(tracks => {
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
  }, 1000);

  return bufferHealthDataHandlersByMusicianId;
}

function shouldTogglePause(displayState: DisplayState) {
  const { writeIndex, paused, pausedIndex } = displayState;

  // Unpause if we have a good data buffer (1 second at 60 Hz)
  if (paused && wrappedDist(writeIndex, pausedIndex) >= 60) return true;
  // Pause if we reach the end of the known data

  if (!paused && wrappedDist(getNewReadIndex(displayState), writeIndex) >= 0) {
    console.log(getNewReadIndex(displayState), writeIndex, wrappedDist(getNewReadIndex(displayState), writeIndex));
    return true;
  }
  return false;
}

function wrappedDist(x2: number, x1: number): number {
  const period = 60 * 5;
  const dist = x2 - x1;
  if (dist < -period / 2) {
    //console.log(dist, dist + period);
    return dist + period;
  }
  if (dist > period / 2) {
    //console.log(dist, dist + period);
    return dist - period;
  }
  return dist;
}

function drawBufferData(ctx, ringBuffer: Float32Array, readIndex: number) {
  const lowerBound = 0;
  const upperBound = 2;
  ctx.clearRect(0, 0, ctx.canvas.width, ctx.canvas.height);
  // background
  ctx.fillStyle = Colors.DARK_GRAY2;
  ctx.fillRect(0, 0, ctx.canvas.width, ctx.canvas.height);
  //ctx.globalAlpha = 1;

  for (let i = 0; i < ctx.canvas.width; i++) {
    const dataIndex = Math.abs(
      (readIndex + i - ctx.canvas.width + 1 + ringBuffer.length) %
        ringBuffer.length
    );
    const rawValue = ringBuffer[dataIndex];
    const value = ctx.canvas.height * (rawValue / (upperBound - lowerBound));

    ctx.fillStyle = Colors.GREEN5;
    ctx.fillRect(i, ctx.canvas.height - value, 1, 1);
    ctx.fillStyle = Colors.GREEN1;
    ctx.fillRect(i, ctx.canvas.height - value + 1, 1, value - 1);
  }
}
function getNewReadIndex({ pausedIndex, unpausedTime }: DisplayState) {
  return (pausedIndex + Math.floor(60 * ((Date.now() - unpausedTime) / 1000))) % (60 * 5);
}
interface DisplayState {
  writeIndex: number;
  paused: boolean;
  unpausedTime: number;
  pausedIndex: number;
}
interface Props {
  dataHandler: BufferHealthDataHandler;
}
export default function BufferHealthDisplay({ dataHandler }: Props) {
  const ringBuffer = useMemo(() => new Float32Array(60 * 5), []);
  const displayState = useRef<DisplayState>({
    writeIndex: 0,
    paused: true,
    unpausedTime: 0,
    pausedIndex: 0,
  });

  useEffect(
    () => {
      console.log('once-o');
      dataHandler.pushData = (data: number[]) => {
        const { writeIndex } = displayState.current;
        for (let i = 0; i < data.length; i++) {
          ringBuffer[writeIndex + i] = data[i];
        }
        displayState.current.writeIndex =
          (writeIndex + data.length) % ringBuffer.length;

        //console.log('data pushed', data);
      };
    },
    [dataHandler, displayState, ringBuffer]
  );
  const draw = useCallback(
    ctx => {
      if (shouldTogglePause(displayState.current)) {
        if (displayState.current.paused) {
          displayState.current.unpausedTime = Date.now();
          console.log('unpaused');
        } else {
          displayState.current.pausedIndex = getNewReadIndex(
            displayState.current
          );
          console.log('paused');
        }
        displayState.current.paused = !displayState.current.paused;
      }

      if (!displayState.current.paused)
        drawBufferData(ctx, ringBuffer, getNewReadIndex(displayState.current));
    },
    [displayState, ringBuffer]
  );

  return (
    <Canvas
      draw={draw}
      style={{ imageRendering: 'pixelated', height: 30, width: 60 }}
    />
  );
}
