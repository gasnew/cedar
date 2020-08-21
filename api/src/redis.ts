// This file contains functions for setting up the Express app with Redis and
// for performing CRUD operations on our Redis DB. If this file gets too big,
// we may want to break out different "Models" into their own files. For now,
// though, it's handy to keep everything in the same place as we define what
// our DB API ought to look like.

// TODO(gnewman): Try out Redis transactions to try to cut down on the risk of race conditions.

import { ServiceMethods } from '@feathersjs/feathers';
import { Unprocessable } from '@feathersjs/errors';
import _ from 'lodash';
import { Tedis } from 'tedis';
import { v4 as uuidv4 } from 'uuid';

import { Application } from './declarations';
import {
  Collection,
  Collections,
  Musician,
  Musicians,
  Room,
  RoomMeta,
} from './room';

// NOTE(gnewman): For more information on common redis commands, see this
// cheatsheet:
// https://gist.github.com/LeCoupa/1596b8f359ad8812c7271b5322c30946. Generally,
// I think we're going to use redis hashes to store our records and a redis
// stream for audio data.

interface RedisHelpers {
  getMusicians: (roomId: string) => Promise<Musicians>;
  createMusician: (roomId: string, name: string) => Promise<Musician>;
  getRoom: (roomId: string) => Promise<RoomMeta>;
  createRoom: (name: string) => Promise<RoomMeta>;
}

export type Redis = Tedis & RedisHelpers;

export function withHelpers(redisClient: Tedis): Redis {
  const parseOrThrow = <Model>(jsonString: any): Model => {
    if (typeof jsonString !== 'string') {
      throw new Error(
        `${jsonString} could not be parsed because it is not a string!`
      );
    }
    return JSON.parse(jsonString);
  };
  const getCollection = <Model>(
    collectionName: keyof Collections
  ): ((roomId: string) => Promise<Collection<Model>>) => async roomId =>
    _.mapValues(
      await redisClient.hgetall(rKey({ roomId, collection: collectionName })),
      jsonString => parseOrThrow<Model>(jsonString)
    );

  const helperMethods: RedisHelpers = {
    getMusicians: getCollection<Musician>('musicians'),
    createMusician: async (roomId: string, name: string) => {
      if (!(await redisClient.exists(rKey({ roomId }))))
        throw new Unprocessable(`Room ${roomId} does not exist!`);

      const newMusician: Musician = {
        id: uuidv4(),
        name,
        previousMusicianId: null,
      };
      await redisClient.hset(
        rKey({ roomId, collection: 'musicians' }),
        newMusician.id,
        JSON.stringify(newMusician)
      );
      return newMusician;
    },
    getRoom: async (roomId: string) => {
      if (!(await redisClient.exists(rKey({ roomId }))))
        throw new Unprocessable(`Room ${roomId} does not exist!`);

      return parseOrThrow<RoomMeta>(
        await redisClient.hget(rKey({ roomId }), 'meta')
      );
    },
    createRoom: async (name: string) => {
      const newRoom: RoomMeta = {
        id: uuidv4(),
        name,
      };
      await redisClient.hset(
        rKey({ roomId: newRoom.id }),
        'meta',
        JSON.stringify(newRoom)
      );
      return newRoom;
    },
  };
  // NOTE(gnewman): Normally, I'd want to use the spread syntax to merge
  // objects like this, but according to the MDN web docs, this uses
  // Object.assign to a blank object under the hood, which does not copy over
  // properties from a prototype. So using spread syntax here won't get us
  // the actual object we want. Instead, then, we create a new instance of
  // the Tedis client with Object.create (so this can remain a pure function)
  // and assign our RedisHelpers methods to that.
  return Object.assign(Object.create(redisClient), helperMethods);
}

interface RedisKeyParameters {
  roomId: string;
  collection?: keyof Collections;
}
// Generate a key of the form "{roomId}" or "{roomId}:{collection}" for
// various Redis calls
export function rKey({ roomId, collection }: RedisKeyParameters): string {
  return `${roomId}${collection ? `:${collection}` : ''}`;
}

export function connectToRedis(
  app: Application,
  redisClient: Redis
): Application {
  redisClient.on('error', error => console.error(`Redis error: ${error}`));
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