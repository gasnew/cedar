import { ServiceMethods } from '@feathersjs/feathers';

import { Application } from '../../declarations';
import { Redis, withRedis } from '../../models';
import { QueryParams } from '../index.d';
import { Recording, RecordingState } from '../../room';

type RecordingsService = Partial<ServiceMethods<Recording>>;
type FindQueryParams = QueryParams<{
  roomId: string;
  cursorsByRecording: { [recordingId: string]: string };
}>;

function buildRecordings(redisClient: Redis): RecordingsService {
  return {
    get: (
      recordingId: string,
      { query: { roomId } }: QueryParams<{ roomId: string }>
    ) => redisClient.getRecording(roomId, recordingId),
    create: (
      {  }: {},
      { query: { roomId } }: QueryParams<{ roomId: string }>
    ) => redisClient.createRecording(roomId),
    patch: (
      id: string,
      { state }: { state: RecordingState },
      { query: { roomId } }: QueryParams<{ roomId: string }>
    ) => redisClient.patchRecording(roomId, id, state),
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
