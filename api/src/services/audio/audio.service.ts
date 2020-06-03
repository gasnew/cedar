// TODO(gnewman): This is a skeleton service--doesn't do anything right now...
// We probably want to rewrite this as a "tracks" service or something

import { ServiceMethods } from '@feathersjs/feathers';
import { Unprocessable } from '@feathersjs/errors';
import { Tedis } from 'tedis';

import { Application } from '../../declarations';
import { withRedis } from '../../redis';

interface Audio {
  musicianId: string;
  data: string[];
}

interface QueryParams {
  query: {
    roomId: string;
  };
}

// NOTE(gnewman): If we fail to implement any of the basic service functions
// (e.g., fetch, get, update, etc.), then Feathers will default it to emitting
// a NotImplemented error. We use Partial here so that we don't have to bother
// defining empty methods for the other endpoints.
// https://docs.feathersjs.com/api/services.html#service-methods
type AudioService = Partial<ServiceMethods<Audio>>;

function buildAudio(redisClient: Tedis): AudioService {
  return {
    find: async (params: QueryParams) => {
      const roomId = params.query;
      throw new Unprocessable('Room does not exist!');
      return [
        {
          musicianId: 'abcd',
          data: ['a', 'b', 'c'],
        },
      ];
    },
    patch: async (roomId: string, audio: Audio) => {
      return [
        {
          musicianId: 'abcd',
          data: ['a', 'b', 'c', ...audio.data],
        },
      ];
    },
  };
}

// Add this service to the service type index
declare module '../../declarations' {
  interface ServiceTypes {
    audio: AudioService;
  }
}

export default function(app: Application) {
  app.use('/audio', withRedis(app, buildAudio));
}
