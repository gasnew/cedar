import { v4 as uuidv4 } from 'uuid';
import { Unprocessable } from '@feathersjs/errors';
import { Room, RoomMeta } from '../room';
import commonInterface from './common';
import { IORedisClient } from './index';

export interface RoomInterface {
  getRoom: (roomId: string) => Promise<RoomMeta>;
  createRoom: (name: string) => Promise<RoomMeta>;
}

export default function(redisClient: IORedisClient): RoomInterface {
  const { getCollection, parseOrThrow, rKey } = commonInterface(redisClient);

  return {
    getRoom: async (roomId: string) => {
      if (!(await redisClient.exists(rKey({ roomId }))))
        throw new Unprocessable(`Room ${roomId} does not exist!`);

      return parseOrThrow<RoomMeta>(
        await redisClient.hget(rKey({ roomId }), 'meta')
      );
    },
    createRoom: async (name: string) => {
      const newRoom: RoomMeta = {
        id: uuidv4(),
        name,
      };
      await redisClient.hset(
        rKey({ roomId: newRoom.id }),
        'meta',
        JSON.stringify(newRoom)
      );
      return newRoom;
    },
  };
}
