import _ from 'lodash';
import IORedis from 'ioredis';
import { v4 as uuidv4 } from 'uuid';
import { mocked } from 'ts-jest/utils';
import { Unprocessable } from '@feathersjs/errors';

import { withHelpers } from '../../src/models';

jest.mock('uuid');
const MockIORedis = jest.genMockFromModule<typeof IORedis.prototype>('ioredis');

describe('recording methods', () => {
  it('raises an error if a recording is already running', async () => {
    expect.assertions(1);
    const mockRedis = new MockIORedis();
    const client = withHelpers(mockRedis);
    mockRedis.exists.mockResolvedValue(true);
    const roomMeta = {
      id: 'abc',
      name: 'Roomy McRoomface',
      recordingId: 'some-recording-uuid',
      musicianIdsChain: ['musician1-id'],
    };
    mockRedis.hget.mockResolvedValue(JSON.stringify(roomMeta));

    await expect(() =>
      client.createRecording('room-uuid')
    ).rejects.toThrowError(/another is running!/);
  });

  it('creates a recording, along with a track for each musician', async () => {
    expect.assertions(5);
    const mockRedis = new MockIORedis();
    const client = withHelpers(mockRedis);
    mockRedis.exists.mockResolvedValue(true);
    const musicians = {
      abc: {
        id: 'abc',
        name: 'Bob Tuba',
      },
      def: {
        id: 'def',
        name: 'Bob Tuba',
      },
    };
    const roomMeta = {
      id: 'abc',
      name: 'Roomy McRoomface',
      recordingId: null,
      musicianIdsChain: ['abc', 'def'],
    };
    mockRedis.hget.mockResolvedValue(JSON.stringify(roomMeta));
    mocked(uuidv4).mockReturnValueOnce('recording-uuid');
    mocked(uuidv4).mockReturnValueOnce('track1-uuid');
    mocked(uuidv4).mockReturnValueOnce('track2-uuid');

    mockRedis.hgetall.mockResolvedValue(_.mapValues(musicians, JSON.stringify));

    const response = await client.createRecording('room-uuid');

    expect(client.hset).toHaveBeenCalledWith(
      'room-uuid',
      'meta',
      JSON.stringify({
        ...roomMeta,
        recordingId: 'recording-uuid',
      })
    );
    expect(client.hset).toHaveBeenCalledWith(
      'room-uuid:tracks',
      'track1-uuid',
      JSON.stringify({
        id: 'track1-uuid',
        musicianId: 'abc',
        data: [],
        cursor: null,
      })
    );
    expect(client.hset).toHaveBeenCalledWith(
      'room-uuid:tracks',
      'track2-uuid',
      JSON.stringify({
        id: 'track2-uuid',
        musicianId: 'def',
        data: [],
        cursor: null,
      })
    );
    const newRecording = {
      id: 'recording-uuid',
      state: 'running',
      trackIds: ['track1-uuid', 'track2-uuid'],
    };
    expect(client.hset).toHaveBeenCalledWith(
      'room-uuid:recordings',
      'recording-uuid',
      JSON.stringify(newRecording)
    );
    expect(response).toEqual(newRecording);
  });
});
