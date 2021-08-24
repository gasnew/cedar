import _ from 'lodash';
import { v4 as uuidv4 } from 'uuid';
import { Unprocessable } from '@feathersjs/errors';
import { Recording, Recordings, RecordingState } from '../room';
import commonInterface from './common';
import { IORedisClient } from './index';
import musicianInterface from './musicians';
import roomInterface from './rooms';
import trackInterface from './tracks';

export interface RecordingInterface {
  getRecordings: (roomId: string) => Promise<Recordings>;
  getRecording: (roomId: string, recordingId: string) => Promise<Recording>;
  createRecording: (roomId: string) => Promise<Recording>;
  patchRecording: (
    roomId: string,
    recordingId: string,
    state: RecordingState
  ) => Promise<Recording>;
}

export default function (redisClient: IORedisClient): RecordingInterface {
  const { getCollection, parseOrThrow, rKey, rStreamKey } = commonInterface(
    redisClient
  );
  const { getMusicians } = musicianInterface(redisClient);
  const { createTrack } = trackInterface(redisClient);
  const { getRoom } = roomInterface(redisClient);

  return {
    getRecordings: getCollection<Recording>('recordings'),
    getRecording: async (roomId: string, recordingId: string) => {
      if (!(await redisClient.exists(rKey({ roomId }))))
        throw new Unprocessable(`Room ${roomId} does not exist!`);

      return parseOrThrow<Recording>(
        await redisClient.hget(
          rKey({ roomId, collection: 'recordings' }),
          recordingId
        )
      );
    },
    createRecording: async (roomId: string) => {
      const room = await getRoom(roomId);
      if (room.recordingId) {
        throw new Unprocessable(
          'A new recording cannot begin while another is running!'
        );
      }

      const recordingId = uuidv4();
      await redisClient.hset(
        rKey({ roomId }),
        'meta',
        JSON.stringify({ ...room, recordingId })
      );
      const musicians = await getMusicians(roomId);
      const tracks = await Promise.all(
        _.map(musicians, (musician) => createTrack(roomId, musician.id))
      );
      const newRecording: Recording = {
        id: recordingId,
        state: 'running',
        trackIds: _.map(tracks, 'id'),
      };
      await redisClient.hset(
        rKey({ roomId: roomId, collection: 'recordings' }),
        newRecording.id,
        JSON.stringify(newRecording)
      );
      return newRecording;
    },
    patchRecording: async (
      roomId: string,
      recordingId: string,
      state: RecordingState
    ) => {
      const room = await getRoom(roomId);
      const recording = parseOrThrow<Recording>(
        await redisClient.hget(
          rKey({ roomId, collection: 'recordings' }),
          recordingId
        )
      );
      const updatedRecording = {
        ...recording,
        state: state,
      };

      // When stopping a recording, do some room-level updates.
      if (state === 'stopped') {
        // Remove inactive musicians from the chain
        const musicians = await getMusicians(roomId);
        const musicianIdsChain = _.filter(
          room.musicianIdsChain,
          (id) => musicians[id].active
        );

        await redisClient.hset(
          rKey({ roomId }),
          'meta',
          JSON.stringify({
            ...room,
            musicianIdsChain,
            recordingId: null,
          })
        );

        // Delete track data.
        // NOTE(gnewman): From testing, fetching and writing data to a deleted
        // stream are basically no-ops, so it's fine if R/W occurs after we've
        // deleted the streams.
        // TODO(gnewman): Once we have a worker for extracting track data into
        // long-term storage, move stream deletion to that worker.
        await Promise.all(
          _.map(recording.trackIds, async (trackId) =>
            redisClient.del(rStreamKey({ roomId, trackId }))
          )
        );
      }
      await redisClient.hset(
        rKey({ roomId: roomId, collection: 'recordings' }),
        recordingId,
        JSON.stringify(updatedRecording)
      );

      return updatedRecording;
    },
  };
}
