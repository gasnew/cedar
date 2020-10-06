import { ServiceMethods } from '@feathersjs/feathers';

import { Application } from '../../declarations';
import { Redis, withRedis } from '../../models';
import { QueryParams } from '../index.d';
import { RoomMeta } from '../../room';
import roomHooks from './rooms.hooks';

type RoomService = Partial<ServiceMethods<RoomMeta>>;

function buildRoomService(redisClient: Redis): RoomService {
  return {
    get: (roomId: string) => redisClient.getRoom(roomId),
    create: ({ name }: { name: string }) => redisClient.createRoom(name),
    patch: (
      id: string,
      room: Partial<RoomMeta>,
      { query: { roomId } }: QueryParams<{ roomId: string }>
    ) => redisClient.patchRoom(id, room),
  };
}

// Add this service to the service type index
declare module '../../declarations' {
  interface ServiceTypes {
    rooms: RoomService;
  }
}

export default function(app: Application) {
  app.use('/rooms', withRedis(app, buildRoomService));

  const roomService = app.service('rooms');
  roomService.hooks(roomHooks);
}
