import _ from 'lodash';

import {
  Collection,
  Collections,
  Musician,
  Musicians,
  Room,
  RoomMeta,
  Track,
} from '../room';
import { IORedisClient } from './index';

interface RedisKeyParameters {
  roomId: string;
  collection?: keyof Collections;
}
interface RedisStreamKeyParameters {
  roomId: string;
  trackId: string;
}
export interface CommonInterface {
  rKey: (params: RedisKeyParameters) => string;
  rStreamKey: (params: RedisStreamKeyParameters) => string;
  parseOrThrow: <TModel>(jsonString: any) => TModel;
  getCollection: <TModel>(
    collectionName: keyof Collections
  ) => (roomId: string) => Promise<Collection<TModel>>;
}

// Generate a key of the form "{roomId}" or "{roomId}:{collection}" for
// various Redis calls
export function rKey({ roomId, collection }: RedisKeyParameters): string {
  return `${roomId}${collection ? `:${collection}` : ''}`;
}

// Generate a key of the form "{roomId}:{trackId}" for accessing track streams
export function rStreamKey({
  roomId,
  trackId,
}: RedisStreamKeyParameters): string {
  return `${roomId}:${trackId}`;
}

export default function(redisClient: IORedisClient): CommonInterface {
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

  return {
    parseOrThrow,
    getCollection,
    rKey,
    rStreamKey,
  };
}
