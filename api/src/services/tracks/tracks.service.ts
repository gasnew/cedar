import _ from 'lodash';
import { ServiceMethods } from '@feathersjs/feathers';
import { Unprocessable } from '@feathersjs/errors';

import { Application } from '../../declarations';
import { Redis, withRedis } from '../../models';
import { QueryParams } from '../index.d';
import { Track } from '../../room';

type TracksService = Partial<ServiceMethods<Track>>;
type FindQueryParams = QueryParams<{
  roomId: string;
  cursorsByTrack: { [trackId: string]: string };
}>;

function buildTracks(redisClient: Redis): TracksService {
  return {
    find: async (params: FindQueryParams) => {
      const { roomId, cursorsByTrack } = params.query;
      console.log(cursorsByTrack);
      return Promise.all(
        _.map(cursorsByTrack, (cursor, trackId) =>
          redisClient.getTrack(roomId, trackId, cursor)
        )
      );
    },
    create: (
      { musicianId }: { musicianId: string },
      { query: { roomId } }: QueryParams<{ roomId: string }>
    ) => redisClient.createTrack(roomId, musicianId),
    patch: async (
      id: string,
      { data, cursor }: { data: string[]; cursor: string },
      { query: { roomId } }: QueryParams<{ roomId: string }>
    ) => {
      console.log('DATA', data);
      return redisClient.appendTrackData(roomId, { id, data, cursor });
    },
  };
}

// Add this service to the service type index
declare module '../../declarations' {
  interface ServiceTypes {
    tracks: TracksService;
  }
}

export default function(app: Application) {
  app.use('/tracks', withRedis(app, buildTracks));
}
