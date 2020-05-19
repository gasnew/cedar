import { Unprocessable } from '@feathersjs/errors';
import _ from 'lodash';

import { Application } from '../../declarations';
import { Redis, rKey, withRedis } from '../../redis';
import { ServiceMethods } from '@feathersjs/feathers';
import { Musician } from '../../room';
import { QueryParams } from '../index.d';
import musicianHooks from './musicians.hooks';

type MusicianService = Partial<ServiceMethods<Musician>>;

// NOTE(gnewman): The most useful table in the Feathers docs (info about which
// HTTP method corresponds to which service method) is actually in the Guide
// section, not the API docs:
// https://docs.feathersjs.com/guides/basics/services.html#service-methods. But
// for other information about declaring Feathers services, look here:
// https://docs.feathersjs.com/api/services.html#service-methods
function buildMusicianService(redisClient: Redis): MusicianService {
  return {
    find: async ({ query: { roomId } }: QueryParams<{ roomId: string }>) => {
      // TODO(gnewman): Refactor this check into a before hook or into our
      // custom Redis client
      if (!(await redisClient.exists(rKey({ roomId }))))
        throw new Unprocessable(`Room ${roomId} does not exist!`);

      // NOTE(gnewman): The returned order of musicians is not guaranteed. We
      // return them as a list here because that is how feathers expects the
      // return type of `find` to be formed.
      return _.values(await redisClient.getMusicians(roomId));
    },
    create: async (
      { name }: { name: string },
      { query: { roomId } }: QueryParams<{ roomId: string }>
    ) => {
      console.log(roomId);
      if (!(await redisClient.exists(rKey({ roomId }))))
        throw new Unprocessable(`Room ${roomId} does not exist!`);

      return await redisClient.createMusician(roomId, name);
    },
  };
}

// Add this service to the service type index
declare module '../../declarations' {
  interface ServiceTypes {
    musicians: MusicianService;
  }
}

export default function(app: Application) {
  app.use('/musicians', withRedis(app, buildMusicianService));

  const musicianService = app.service('musicians');
  musicianService.hooks(musicianHooks);
}
