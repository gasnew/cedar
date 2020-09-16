import { v4 as uuidv4 } from 'uuid';
import { Unprocessable } from '@feathersjs/errors';
import { Room, RoomMeta } from '../room';
import commonInterface from './common';
import { IORedisClient } from './index';

export interface RoomInterface {
  getRoom: (roomId: string) => Promise<RoomMeta>;
  createRoom: (name: string) => Promise<RoomMeta>;
  patchRoom: (roomId: string, room: Partial<RoomMeta>) => Promise<RoomMeta>;
}

export default function(redisClient: IORedisClient): RoomInterface {
  const { getCollection, parseOrThrow, rKey } = commonInterface(redisClient);

  const getRoom = async (roomId: string) => {
    if (!(await redisClient.exists(rKey({ roomId }))))
      throw new Unprocessable(`Room ${roomId} does not exist!`);

    return parseOrThrow<RoomMeta>(
      await redisClient.hget(rKey({ roomId }), 'meta')
    );
  };

  return {
    getRoom,
    createRoom: async (name: string) => {
      const newRoom: RoomMeta = {
        id: uuidv4(),
        name,
        recordingId: null,
        musicianIdsChain: [],
      };
      await redisClient.hset(
        rKey({ roomId: newRoom.id }),
        'meta',
        JSON.stringify(newRoom)
      );
      return newRoom;
    },
    patchRoom: async (roomId: string, roomUpdates: Partial<RoomMeta>) => {
      const room = await getRoom(roomId);

      if (room.recordingId)
        throw new Unprocessable(
          'Rooms cannot be modified while a recording is happening!'
        );

      const updatedRoom = {
        ...room,
        ...roomUpdates,
      };
      await redisClient.hset(
        rKey({ roomId }),
        'meta',
        JSON.stringify(updatedRoom)
      );

      return updatedRoom;
    },
  };
}
