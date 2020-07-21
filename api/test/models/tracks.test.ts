import _ from 'lodash';
import IORedis from 'ioredis';
import { v4 as uuidv4 } from 'uuid';
import { mocked } from 'ts-jest/utils';
import { Unprocessable } from '@feathersjs/errors';

import { withHelpers } from '../../src/models';

jest.mock('uuid');
const MockIORedis = jest.genMockFromModule<typeof IORedis.prototype>('ioredis');

describe('track methods', () => {
  const mockRedis = new MockIORedis();
  const client = withHelpers(mockRedis);
  beforeAll(() => {
    mockRedis.exists.mockResolvedValue(true);
  });

  describe('reading from a track', () => {
    it('raises an error if the cursor is invalid', async () => {
      expect.assertions(1);
      await expect(
        client.getTrack('room-id', 'track-id', 'invalid-cursor-id')
      ).rejects.toThrowError(/"invalid-cursor-id" is not a valid cursor!/);
    });

    it('raises an error if the track does not exist', async () => {
      expect.assertions(1);
      await expect(
        client.getTrack('room-id', 'fake-track-id', '123-0')
      ).rejects.toThrowError(/Track "fake-track-id" does not exist!/);
    });

    it('returns a track with all its data', async () => {
      expect.assertions(2);

      const track = {
        id: 'track-id',
        musicianId: 'musician-id',
        data: [],
        cursor: null,
      };
      mockRedis.hget.mockResolvedValue(JSON.stringify(track));
      mockRedis.xrange.mockResolvedValue([
        ['123-0', ['data', 'one', 'data', 'two']],
        ['456-0', ['data', 'five!']],
      ]);

      const response = await client.getTrack('room-id', 'track-id', null);

      expect(mockRedis.xrange).toHaveBeenCalledWith(
        'room-id:track-id',
        '-',
        '+'
      );
      expect(response).toEqual({
        id: 'track-id',
        musicianId: 'musician-id',
        data: ['one', 'two', 'five!'],
        cursor: '456-0',
      });
    });

    it('returns a track with all its data after the cursor', async () => {
      expect.assertions(2);

      const track = {
        id: 'track-id',
        musicianId: 'musician-id',
        data: [],
        cursor: '456-0',
      };
      mockRedis.hget.mockResolvedValue(JSON.stringify(track));
      mockRedis.xrange.mockResolvedValue([
        ['789-0', ['data', 'hokay', 'data', 'so']],
      ]);

      const response = await client.getTrack('room-id', 'track-id', '456-0');

      expect(mockRedis.xrange).toHaveBeenCalledWith(
        'room-id:track-id',
        '456-1',
        '+'
      );
      expect(response).toEqual({
        id: 'track-id',
        musicianId: 'musician-id',
        data: ['hokay', 'so'],
        cursor: '789-0',
      });
    });
  });

  describe('creating a track', () => {
    it('creates a track', async () => {
      expect.assertions(1);
      mocked(uuidv4).mockReturnValueOnce('track-id');

      await client.createTrack('room-id', 'musician-id');

      expect(client.hset).toHaveBeenCalledWith(
        'room-id:tracks',
        'track-id',
        JSON.stringify({
          id: 'track-id',
          musicianId: 'musician-id',
          data: [],
          cursor: null,
        })
      );
    });
  });

  describe('appending data to a track', () => {
    it('raises an error if the cursor is not the expected cursor for fetching', async () => {
      expect.assertions(1);

      const track = {
        id: 'track-id',
        musicianId: 'musician-id',
        data: [],
        cursor: '456-0',
      };
      mockRedis.hget.mockResolvedValue(JSON.stringify(track));

      await expect(
        client.appendTrackData('room-id', {
          id: 'track-id',
          data: ['some', 'new', 'data'],
          cursor: '123-0',
        })
      ).rejects.toThrowError(
        /Provided cursor "123-0" does not match the current cursor "456-0"/
      );
    });

    it('appends data to the track', async () => {
      expect.assertions(2);

      const track = {
        id: 'track-id',
        musicianId: 'musician-id',
        data: [],
        cursor: '456-0',
      };
      mockRedis.hget.mockResolvedValue(JSON.stringify(track));
      mockRedis.xadd.mockResolvedValue('789-0');

      const response = await client.appendTrackData('room-id', {
        id: 'track-id',
        data: ['some', 'new', 'data'],
        cursor: '456-0',
      });

      expect(mockRedis.xadd).toHaveBeenCalledWith(
        'room-id:track-id',
        '*',
        'data',
        'some',
        'data',
        'new',
        'data',
        'data'
      );
      expect(response).toEqual({
        id: 'track-id',
        musicianId: 'musician-id',
        data: ['some', 'new', 'data'],
        cursor: '789-0',
      });
    });
  });
});
