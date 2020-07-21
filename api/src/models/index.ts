// This file contains functions for setting up the Express app with Redis and
// for performing CRUD operations on our Redis DB.

// NOTE(gnewman): For more information on common redis commands, see this
// cheatsheet:
// https://gist.github.com/LeCoupa/1596b8f359ad8812c7271b5322c30946.

// TODO(gnewman): Try out Redis transactions to try to cut down on the risk of race conditions.

import { ServiceMethods } from '@feathersjs/feathers';
import { Unprocessable } from '@feathersjs/errors';
import _ from 'lodash';
import IORedis from 'ioredis';
import { v4 as uuidv4 } from 'uuid';

import { Application } from '../declarations';
import musicianInterface, { MusicianInterface } from './musicians';
import recordingInterface, { RecordingInterface } from './recordings';
import roomInterface, { RoomInterface } from './rooms';
import trackInterface, { TrackInterface } from './tracks';

export type IORedisClient = typeof IORedis.prototype;

type RedisHelpers = MusicianInterface &
  RecordingInterface &
  RoomInterface &
  TrackInterface;
export type Redis = IORedisClient & RedisHelpers;

export function withHelpers(redisClient: IORedisClient): Redis {
  const helperMethods = {
    ...musicianInterface(redisClient),
    ...recordingInterface(redisClient),
    ...roomInterface(redisClient),
    ...trackInterface(redisClient),
  };

  // NOTE(gnewman): Normally, I'd want to use the spread syntax to merge
  // objects like this, but according to the MDN web docs, this uses
  // Object.assign to a blank object under the hood, which does not copy over
  // properties from a prototype. So using spread syntax here won't get us
  // the actual object we want. Instead, then, we create a new instance of
  // the IORedis client with Object.create (so this can remain a pure function)
  // and assign our RedisHelpers methods to that.
  return Object.assign(Object.create(redisClient), helperMethods);
}

export function connectToRedis(
  app: Application,
  redisClient: Redis
): Application {
  redisClient.on('error', (error: Error) =>
    console.error(`Redis error: ${error}`)
  );
  redisClient.on('connect', () =>
    console.log('Connected to the Redis server!')
  );
  app.set('redis', redisClient);
  return app;
}

export function withRedis<APIObject>(
  app: Application,
  buildService: (redisClient: Redis) => Partial<ServiceMethods<APIObject>>
) {
  return buildService(app.get('redis'));
}
