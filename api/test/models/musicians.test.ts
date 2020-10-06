import _ from 'lodash';
import IORedis from 'ioredis';
import { v4 as uuidv4 } from 'uuid';
import { mocked } from 'ts-jest/utils';
import { Unprocessable } from '@feathersjs/errors';

import { withHelpers } from '../../src/models';

jest.mock('uuid');
const MockIORedis = jest.genMockFromModule<typeof IORedis.prototype>('ioredis');

describe('musician methods', () => {
  it('can return all musicians in a room', async () => {
    expect.assertions(2);
    const mockRedis = new MockIORedis();
    const client = withHelpers(mockRedis);

    const musicians = {
      abc: {
        id: 'abc',
        name: 'Bob Tuba',
        previousMusicianId: null,
      },
      def: {
        id: 'def',
        name: 'Bob Tuba',
        previousMusicianId: 'abc',
      },
    };
    mockRedis.hgetall.mockResolvedValue(_.mapValues(musicians, JSON.stringify));

    const response = await client.getMusicians('room-uuid');

    expect(client.hgetall).toHaveBeenCalledWith('room-uuid:musicians');
    expect(response).toEqual(musicians);
  });

  it('can create a musician and add to the chain', async () => {
    expect.assertions(1);
    const mockRedis = new MockIORedis();
    const client = withHelpers(mockRedis);
    mockRedis.exists.mockResolvedValue(true);
    const roomMeta = {
      id: 'abc',
      name: 'Roomy McRoomface',
      recordingId: null,
      musicianIdsChain: ['musician1-id'],
    };
    mockRedis.hget.mockResolvedValue(JSON.stringify(roomMeta));
    mocked(uuidv4).mockReturnValueOnce('musician-uuid');

    await client.createMusician('room-uuid', 'Bobby Tuba');

    expect(client.hset).toHaveBeenCalledWith(
      'room-uuid:musicians',
      'musician-uuid',
      JSON.stringify({
        id: 'musician-uuid',
        name: 'Bobby Tuba',
      })
    );
  });
});
