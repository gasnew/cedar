import _ from 'lodash';
import { v4 as uuidv4 } from 'uuid';
import { Unprocessable } from '@feathersjs/errors';
import { Recording } from '../room';
import commonInterface from './common';
import { IORedisClient } from './index';
import musicianInterface from './musicians';
import roomInterface from './rooms';
import trackInterface from './tracks';

export interface RecordingInterface {
  getRecording: (roomId: string, recordingId: string) => Promise<Recording>;
  createRecording: (roomId: string) => Promise<Recording>;
}

export default function(redisClient: IORedisClient): RecordingInterface {
  const { getCollection, parseOrThrow, rKey } = commonInterface(redisClient);
  const { getMusicians } = musicianInterface(redisClient);
  const { createTrack } = trackInterface(redisClient);
  const { getRoom } = roomInterface(redisClient);

  return {
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
        _.map(musicians, musician => createTrack(roomId, musician.id))
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
  };
}
