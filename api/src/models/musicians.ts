import { v4 as uuidv4 } from 'uuid';
import { Unprocessable } from '@feathersjs/errors';
import { Musician, Musicians } from '../room';
import commonInterface from './common';
import roomInterface from './rooms';
import { IORedisClient } from './index';

export interface MusicianInterface {
  getMusicians: (roomId: string) => Promise<Musicians>;
  getMusician: (roomId: string, musicianId: string) => Promise<Musician>;
  createMusician: (roomId: string, name: string) => Promise<Musician>;
  patchMusician: (
    roomId: string,
    musicianId: string,
    musician: Partial<Musician>
  ) => Promise<Musician>;
}

export default function(redisClient: IORedisClient): MusicianInterface {
  const { getCollection, parseOrThrow, rKey } = commonInterface(redisClient);
  const { getRoom } = roomInterface(redisClient);

  return {
    getMusicians: getCollection<Musician>('musicians'),
    getMusician: async (roomId: string, musicianId: string) => {
      if (!(await redisClient.exists(rKey({ roomId }))))
        throw new Unprocessable(`Room ${roomId} does not exist!`);

      return parseOrThrow<Musician>(
        await redisClient.hget(
          rKey({ roomId, collection: 'musicians' }),
          musicianId
        )
      );
    },
    createMusician: async (roomId: string, name: string) => {
      const room = await getRoom(roomId);

      const newMusician: Musician = {
        id: uuidv4(),
        name,
        loopbackLatencyMs: null,
      };
      await redisClient.hset(
        rKey({ roomId, collection: 'musicians' }),
        newMusician.id,
        JSON.stringify(newMusician)
      );

      return newMusician;
    },
    patchMusician: async (
      roomId: string,
      musicianId: string,
      musicianUpdates: Partial<Musician>
    ) => {
      const room = await getRoom(roomId);
      const musician = parseOrThrow<Musician>(
        await redisClient.hget(
          rKey({ roomId, collection: 'musicians' }),
          musicianId
        )
      );
      const updatedMusician = {
        ...musician,
        ...musicianUpdates,
      };

      await redisClient.hset(
        rKey({ roomId: roomId, collection: 'musicians' }),
        musicianId,
        JSON.stringify(updatedMusician)
      );

      return updatedMusician;
    },
  };
}
