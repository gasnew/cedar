import { Unprocessable } from '@feathersjs/errors';
import _ from 'lodash';

import { Application } from '../../declarations';
import { Redis, rKey, withRedis } from '../../redis';
import { ServiceMethods } from '@feathersjs/feathers';
import { Musician } from '../../room';
import { QueryParams } from '../index.d';
import musicianHooks from './musicians.hooks';

// NOTE(gnewman): If we fail to implement any of the basic service functions
// (e.g., fetch, get, update, etc.), then Feathers will default it to emitting
// a NotImplemented error. We use Partial here so that we don't have to bother
// defining empty methods for the other endpoints.
// https://docs.feathersjs.com/api/services.html#service-methods
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
      // NOTE(gnewman): The returned order of musicians is not guaranteed. We
      // return them as a list here because that is how feathers expects the
      // return type of `find` to be formed.
      return _.values(await redisClient.getMusicians(roomId));
    },
    create: async (
      { name }: { name: string },
      { query: { roomId } }: QueryParams<{ roomId: string }>
    ) => redisClient.createMusician(roomId, name),
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
