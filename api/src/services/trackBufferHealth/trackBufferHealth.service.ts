import _ from 'lodash';
import { ServiceMethods } from '@feathersjs/feathers';

import { Application } from '../../declarations';
import { Redis, withRedis } from '../../models';
import { QueryParams } from '../index.d';
import { Track } from '../../room';

type TrackBufferHealthService = Partial<ServiceMethods<Track>>;
type FindQueryParams = QueryParams<{
  roomId: string;
  cursorsByTrack: { [trackId: string]: string | null };
}>;

// This is a service just for reading and writing a track's buffer health data.
function buildTrackBufferHealthData(redisClient: Redis): TrackBufferHealthService {
  return {
    find: async (params: FindQueryParams) => {
      const { roomId, cursorsByTrack } = params.query;
      return Promise.all(
        _.map(cursorsByTrack, (cursor, trackId) =>
          redisClient.getTrackBufferHealthData(roomId, trackId, cursor)
        )
      );
    },
    patch: async (
      id: string,
      { data }: { data: string[] },
      { query: { roomId } }: QueryParams<{ roomId: string }>
    ) => {
      return redisClient.appendTrackBufferHealthData(roomId, { id, data });
    },
  };
}

// Add this service to the service type index
declare module '../../declarations' {
  interface ServiceTypes {
    trackBufferHealth: TrackBufferHealthService;
  }
}

export default function(app: Application) {
  // NOTE(gnewman): Normally, I would like to make this route something like
  // "/tracks/bufferHealth" to make the hierarchy clear, but alas, Feathers
  // and my current typing setup in FeathersHooks makes doing it this way much
  // easier. As of writing, this is our first example of having multiple
  // services read/write to the same underlying data model, but that's why we
  // have an API in the first place, right?
  app.use('/trackBufferHealth', withRedis(app, buildTrackBufferHealthData));
}
