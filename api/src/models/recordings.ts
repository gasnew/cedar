import _ from 'lodash';
import { v4 as uuidv4 } from 'uuid';
import { Unprocessable } from '@feathersjs/errors';
import { Recording } from '../room';
import commonInterface from './common';
import { IORedisClient } from './index';
import musicianInterface from './musicians';
import trackInterface from './tracks';

export interface RecordingInterface {
  createRecording: (roomId: string) => Promise<Recording>;
}

export default function(redisClient: IORedisClient): RecordingInterface {
  const { getCollection, parseOrThrow, rKey } = commonInterface(redisClient);
  const { getMusicians } = musicianInterface(redisClient);
  const { createTrack } = trackInterface(redisClient);

  return {
    createRecording: async (roomId: string) => {
      if (!(await redisClient.exists(rKey({ roomId }))))
        throw new Unprocessable(`Room ${roomId} does not exist!`);
      const thing = _.values(
        await getCollection<Recording>('recordings')(roomId)
      );
      if (_.some(thing, ['state', 'running'])) {
        throw new Unprocessable(
          'A new recording cannot begin while another is running!'
        );
      }

      const musicians = await getMusicians(roomId);
      const tracks = await Promise.all(
        _.map(musicians, musician => createTrack(roomId, musician.id))
      );
      const newRecording: Recording = {
        id: uuidv4(),
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
