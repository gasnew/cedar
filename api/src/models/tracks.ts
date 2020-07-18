import _ from 'lodash';
import { v4 as uuidv4 } from 'uuid';
import { Unprocessable } from '@feathersjs/errors';
import {
  Collection,
  Collections,
  Musician,
  Musicians,
  Room,
  RoomMeta,
  Track,
} from '../room';
import commonInterface from './common';
import { IORedisClient } from './index';

export interface TrackInterface {
  getTrack: (roomId: string, trackId: string, cursor: string) => Promise<Track>;
  createTrack: (roomId: string, musicianId: string) => Promise<Track>;
  appendTrackData: (
    roomId: string,
    { id, data, cursor }: { id: string; data: string[]; cursor: string | null }
  ) => Promise<Track>;
}

export default function(redisClient: IORedisClient): TrackInterface {
  const { getCollection, parseOrThrow, rKey, rStreamKey } = commonInterface(
    redisClient
  );

  const readFromStream = async (
    streamKey: string,
    cursor: string | null
  ): Promise<{
    data: string[];
    newCursor: string;
  }> => {
    const cursorPlusOne = _.flow(
      cursor => cursor.split('-'),
      ([serverMs, sequenceNum]) => `${serverMs}-${_.toInteger(sequenceNum) + 1}`
    );
    const streamData = await redisClient.xrange(
      streamKey,
      cursor ? cursorPlusOne(cursor) : '-',
      '+'
    );

    const getValues = (set: string[]) =>
      _.map(_.range(set.length / 2), index => set[index * 2 + 1]);
    return {
      data: _.flatMap(streamData, timePoint => getValues(timePoint[1])),
      newCursor:
        streamData.length > 0 ? streamData[streamData.length - 1][0] : cursor,
    };
  };
  const writeToStream = async (
    streamKey: string,
    data: string[]
  ): Promise<{
    newCursor: string;
  }> => {
    const dataArray = _.flatMap(data, value => ['data', value]);
    const newCursor = await redisClient.xadd(streamKey, '*', ...dataArray);
    return { newCursor };
  };

  return {
    getTrack: async (roomId, trackId, cursor) => {
      // We're opting to only accept cursors like 1234-1 (anything else is
      // probably an error in Cedar)
      if (cursor && !/^(\d+)-(\d+)$/.test(cursor))
        throw new Unprocessable(`${cursor} is not a valid cursor!`);
      if (!(await redisClient.exists(rKey({ roomId }))))
        throw new Unprocessable(`Room ${roomId} does not exist!`);

      const trackRKey = rKey({ roomId, collection: 'tracks' });
      const rawTrack = await redisClient.hget(trackRKey, trackId);
      if (!rawTrack)
        throw new Unprocessable(`Track ${trackId} does not exist!`);
      const track = parseOrThrow<Track>(rawTrack);

      const { data, newCursor } = await readFromStream(
        rStreamKey({ roomId, trackId }),
        cursor
      );

      return {
        ...track,
        data,
        cursor: newCursor,
      };
    },
    createTrack: async (roomId: string, musicianId: string) => {
      if (!(await redisClient.exists(rKey({ roomId }))))
        throw new Unprocessable(`Room ${roomId} does not exist!`);
      // TODO: Check track already exists for this musician

      const newTrack: Track = {
        id: uuidv4(),
        musicianId,
        data: [],
        cursor: null,
      };
      // TODO verify musician exists
      await redisClient.hset(
        rKey({ roomId, collection: 'tracks' }),
        newTrack.id,
        JSON.stringify(newTrack)
      );
      return newTrack;
    },
    appendTrackData: async (roomId, { id, data, cursor }) => {
      if (!(await redisClient.exists(rKey({ roomId }))))
        throw new Unprocessable(`Room ${roomId} does not exist!`);
      const track = parseOrThrow<Track>(
        await redisClient.hget(rKey({ roomId, collection: 'tracks' }), id)
      );
      if (track.cursor && cursor !== track.cursor)
        throw new Unprocessable(
          `Provided cursor ${cursor} does not match the current cursor ${track.cursor}`
        );

      const { newCursor } = await writeToStream(
        rStreamKey({ roomId, trackId: id }),
        data
      );
      await redisClient.hset(
        rKey({ roomId, collection: 'tracks' }),
        track.id,
        JSON.stringify({
          ...track,
          cursor: newCursor,
        })
      );
      return {
        ...track,
        data,
        cursor: newCursor,
      };
    },
  };
}
