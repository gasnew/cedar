import _ from 'lodash';
import IORedis from 'ioredis';
import { v4 as uuidv4 } from 'uuid';
import { mocked } from 'ts-jest/utils';
import { Unprocessable } from '@feathersjs/errors';

import { withHelpers } from '../../src/models';

jest.mock('uuid');
const MockIORedis = jest.genMockFromModule<typeof IORedis.prototype>('ioredis');

describe('room methods', () => {
  it('fails when trying to get a room that does not exist', async () => {
    // NOTE(gnewman): We use this "expect.assertions(n)" pattern for async
    // tests only. This lets the engine know whether we've completed the test
    // or not, so it doesn't run forever.
    expect.assertions(1);
    // This actually returns a mocked-out instance of MockIORedis because of
    // our jest.genMockFromModule('ioredis') call above.
    const mockRedis = new MockIORedis();
    const client = withHelpers(mockRedis);

    // getRoom is an async function, so we need to tell Jest to test on the
    // "rejects" case.
    await expect(() => client.getRoom('i-dont-exist')).rejects.toThrowError(
      Unprocessable
    );
  });

  it('can return a room', async () => {
    expect.assertions(2);
    const mockRedis = new MockIORedis();
    const client = withHelpers(mockRedis);
    // Bypass the "does this room exist?" check
    mockRedis.exists.mockResolvedValue(true);

    const roomMeta = {
      id: 'abc',
      name: 'Roomy McRoomface',
      recordingId: 'rec-123',
      musicianIdsChain: ['musician-uuid'],
    };
    mockRedis.hget.mockResolvedValue(JSON.stringify(roomMeta));

    const response = await client.getRoom('room-uuid');

    expect(client.hget).toHaveBeenCalledWith('room-uuid', 'meta');
    expect(response).toEqual(roomMeta);
  });

  it('can create a room', async () => {
    expect.assertions(1);
    const mockRedis = new MockIORedis();
    const client = withHelpers(mockRedis);
    mockRedis.exists.mockResolvedValue(true);
    // We use "mocked" here to wrap the v4 type in a mocked type. Jest
    // doesn't mutate the TypeScript type for the uuidv4 import, even though
    // we call jest.mock('uuid'). So we have to wrap in "mocked" here to
    // avoid TypeScript errors.
    // https://github.com/kulshekhar/ts-jest/issues/576#issuecomment-458178545
    mocked(uuidv4).mockReturnValueOnce('room-uuid');

    await client.createRoom('Roomy McRoomface');

    expect(client.hset).toHaveBeenCalledWith(
      'room-uuid',
      'meta',
      JSON.stringify({
        id: 'room-uuid',
        name: 'Roomy McRoomface',
        recordingId: null,
        musicianIdsChain: [],
      })
    );
  });
});
