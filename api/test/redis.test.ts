import _ from 'lodash';
import { v4 as uuidv4 } from 'uuid';
import { mocked } from 'ts-jest/utils';
import { Unprocessable } from '@feathersjs/errors';

import { withHelpers } from '../src/redis';

jest.mock('uuid');
const { Tedis } = jest.genMockFromModule('tedis');

describe('withHelpers', () => {
  it('returns a Tedis instance with some new methods', () => {
    const tedis = new Tedis();
    const client = withHelpers(tedis);

    expect(client).toBeInstanceOf(Tedis);
    expect(client.getMusicians).toBeDefined();
    expect(client.createMusician).toBeDefined();
  });

  describe('room methods', () => {
    it('fails when trying to get a room that does not exist', async () => {
      // NOTE(gnewman): We use this "expect.assertions(n)" pattern for async
      // tests only. This lets the engine know whether we've completed the test
      // or not, so it doesn't run forever.
      expect.assertions(1);
      // This actually returns a mocked-out instance of Tedis because of our
      // jest.genMockFromModule('tedis') call above.
      const mockRedis = new Tedis();
      const client = withHelpers(mockRedis);

      // getRoom is an async function, so we need to tell Jest to test on the
      // "rejects" case.
      expect(() => client.getRoom('i-dont-exist')).rejects.toThrowError(
        Unprocessable
      );
    });

    it('can return a room', async () => {
      expect.assertions(2);
      const mockRedis = new Tedis();
      const client = withHelpers(mockRedis);
      // Bypass the "does this room exist?" check
      mockRedis.exists.mockResolvedValue(true);

      const roomMeta = {
        id: 'abc',
        name: 'Roomy McRoomface',
      };
      mockRedis.hget.mockResolvedValue(JSON.stringify(roomMeta));

      const response = await client.getRoom('room-uuid');

      expect(client.hget).toHaveBeenCalledWith('room-uuid', 'meta');
      expect(response).toEqual(roomMeta);
    });

    it('can create a room', async () => {
      expect.assertions(1);
      const mockRedis = new Tedis();
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
        })
      );
    });
  });

  describe('musician methods', () => {
    it('can return all musicians in a room', async () => {
      expect.assertions(2);
      const mockRedis = new Tedis();
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
      mockRedis.hgetall.mockResolvedValue(
        _.mapValues(musicians, JSON.stringify)
      );

      const response = await client.getMusicians('room-uuid');

      expect(client.hgetall).toHaveBeenCalledWith('room-uuid:musicians');
      expect(response).toEqual(musicians);
    });

    it('can create a musician', async () => {
      expect.assertions(1);
      const mockRedis = new Tedis();
      const client = withHelpers(mockRedis);
      mockRedis.exists.mockResolvedValue(true);
      mocked(uuidv4).mockReturnValueOnce('musician-uuid');

      await client.createMusician('room-uuid', 'Bobby Tuba');

      expect(client.hset).toHaveBeenCalledWith(
        'room-uuid:musicians',
        'musician-uuid',
        JSON.stringify({
          id: 'musician-uuid',
          name: 'Bobby Tuba',
          previousMusicianId: null,
        })
      );
    });
  });
});
