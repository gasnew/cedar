import _ from 'lodash';
import { v4 as uuidv4 } from 'uuid';
import { Unprocessable } from '@feathersjs/errors';
import { Track } from '../room';
import commonInterface from './common';
import { IORedisClient } from './index';

export interface TrackInterface {
  getTrack: (
    roomId: string,
    trackId: string,
    cursor: string | null
  ) => Promise<Track>;
  createTrack: (roomId: string, musicianId: string) => Promise<Track>;
  appendTrackData: (
    roomId: string,
    { id, data, cursor }: { id: string; data: string[]; cursor: string | null }
  ) => Promise<Track>;
  getTrackBufferHealthData: (
    roomId: string,
    trackId: string,
    cursor: string | null
  ) => Promise<Track>;
  appendTrackBufferHealthData: (
    roomId: string,
    { id, bufferHealthSeconds }: { id: string; bufferHealthSeconds: number[] }
  ) => Promise<Track>;
}

export default function(redisClient: IORedisClient): TrackInterface {
  const { getCollection, parseOrThrow, rKey, rStreamKey } = commonInterface(
    redisClient
  );

  const readFromStream = async <T>(
    streamKey: string,
    cursor: string | null
  ): Promise<{
    data: T[];
    newCursor: string;
  }> => {
    // NOTE(gnewman): The Redis docs suggest that you increase the sequence
    // number by one to start reading from after the previous entry ID
    // (cursor). https://redis.io/commands/xrange#iterating-a-stream. If
    // cursor is null, we use '-' which causes us to read from the beginning of
    // the stream.
    const cursorPlusOne = _.flow(
      cursor => cursor.split('-'),
      ([serverMs, sequenceNum]) => `${serverMs}-${_.toInteger(sequenceNum) + 1}`
    );
    const streamData = await redisClient.xrange(
      streamKey,
      cursor ? cursorPlusOne(cursor) : '-',
      '+'
    );

    // NOTE(gnewman): Stream data comes in the form
    //   [
    //     [entryId1, [key1, value1, key2, value2]],
    //     [entryId2, [key3, value3]]
    //   ]
    // Since the clients only care about "the data that came in after cursor
    // x," we just extract the "value"s and flatten to get our final data
    // array.
    const getValues = (entryValues: T[]) =>
      _.map(
        _.range(entryValues.length / 2),
        index => entryValues[index * 2 + 1]
      );
    return {
      data: _.flatMap(streamData, entry => getValues(entry[1])),
      newCursor:
        streamData.length > 0 ? streamData[streamData.length - 1][0] : cursor,
    };
  };
  const writeToStream = async (
    streamKey: string,
    data: (string | number)[]
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
        throw new Unprocessable(`"${cursor}" is not a valid cursor!`);
      if (!(await redisClient.exists(rKey({ roomId }))))
        throw new Unprocessable(`Room ${roomId} does not exist!`);

      const trackRKey = rKey({ roomId, collection: 'tracks' });
      const rawTrack = await redisClient.hget(trackRKey, trackId);
      if (!rawTrack)
        throw new Unprocessable(`Track "${trackId}" does not exist!`);
      const track = parseOrThrow<Track>(rawTrack);

      const { data, newCursor } = await readFromStream<string>(
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

      const newTrack: Track = {
        id: uuidv4(),
        musicianId,
        data: [],
        cursor: null,
        bufferHealthSeconds: [],
      };
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
          `Provided cursor "${cursor}" does not match the current cursor "${
            track.cursor
          }"`
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
    getTrackBufferHealthData: async (roomId, trackId, cursor) => {
      // We're opting to only accept cursors like 1234-1 (anything else is
      // probably an error in Cedar)
      if (cursor && !/^(\d+)-(\d+)$/.test(cursor))
        throw new Unprocessable(`"${cursor}" is not a valid cursor!`);
      if (!(await redisClient.exists(rKey({ roomId }))))
        throw new Unprocessable(`Room ${roomId} does not exist!`);

      const rawTrack = await redisClient.hget(
        rKey({ roomId, collection: 'tracks' }),
        trackId
      );
      if (!rawTrack)
        throw new Unprocessable(`Track "${trackId}" does not exist!`);
      const track = parseOrThrow<Track>(rawTrack);

      const { data, newCursor } = await readFromStream<number>(
        rStreamKey({ roomId, trackId, suffix: 'buffer-health-data' }),
        cursor
      );

      return {
        ...track,
        bufferHealthSeconds: data,
        cursor: newCursor,
      };
    },
    appendTrackBufferHealthData: async (roomId, { id, bufferHealthSeconds }) => {
      if (!(await redisClient.exists(rKey({ roomId }))))
        throw new Unprocessable(`Room ${roomId} does not exist!`);
      const track = parseOrThrow<Track>(
        await redisClient.hget(rKey({ roomId, collection: 'tracks' }), id)
      );

      await writeToStream(
        rStreamKey({ roomId, trackId: id, suffix: 'buffer-health-data' }),
        bufferHealthSeconds
      );
      return track;
    },
  };
}
