import { v4 as uuidv4 } from 'uuid';
import { Unprocessable } from '@feathersjs/errors';
import { Musician, Musicians } from '../room';
import commonInterface from './common';
import { IORedisClient } from './index';

export interface MusicianInterface {
  getMusicians: (roomId: string) => Promise<Musicians>;
  createMusician: (roomId: string, name: string) => Promise<Musician>;
}

export default function(redisClient: IORedisClient): MusicianInterface {
  const { getCollection, rKey } = commonInterface(redisClient);

  return {
    getMusicians: getCollection<Musician>('musicians'),
    createMusician: async (roomId: string, name: string) => {
      if (!(await redisClient.exists(rKey({ roomId }))))
        throw new Unprocessable(`Room ${roomId} does not exist!`);

      const newMusician: Musician = {
        id: uuidv4(),
        name,
        previousMusicianId: null,
      };
      await redisClient.hset(
        rKey({ roomId, collection: 'musicians' }),
        newMusician.id,
        JSON.stringify(newMusician)
      );
      return newMusician;
    },
  };
}
