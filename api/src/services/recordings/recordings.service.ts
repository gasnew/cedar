import _ from 'lodash';
import { ServiceMethods } from '@feathersjs/feathers';
import { Unprocessable } from '@feathersjs/errors';

import { Application } from '../../declarations';
import { Redis, withRedis } from '../../models';
import { QueryParams } from '../index.d';
import { Recording } from '../../room';

type RecordingsService = Partial<ServiceMethods<Recording>>;
type FindQueryParams = QueryParams<{
  roomId: string;
  cursorsByRecording: { [recordingId: string]: string };
}>;

function buildRecordings(redisClient: Redis): RecordingsService {
  return {
    create: (
      {}: {},
      { query: { roomId } }: QueryParams<{ roomId: string }>
    ) => redisClient.createRecording(roomId),
  };
}

// Add this service to the service type index
declare module '../../declarations' {
  interface ServiceTypes {
    recordings: RecordingsService;
  }
}

export default function(app: Application) {
  app.use('/recordings', withRedis(app, buildRecordings));
}
