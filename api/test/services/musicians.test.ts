import _ from 'lodash';
import { mock, mockClear } from 'jest-mock-extended';
import { BadRequest } from '@feathersjs/errors';

import createApp from '../../src/app';
import { Redis } from '../../src/redis';

describe("'musicians' service", () => {
  const mockRedis = mock<Redis>();
  const app = createApp(mockRedis);

  beforeEach(() => mockClear(mockRedis));

  it('register the musician service', () => {
    expect(app.service('musicians')).toBeTruthy();
  });

  describe('find', () => {
    it('returns musicians', async () => {
      expect.assertions(2);

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
      mockRedis.getMusicians.mockResolvedValue(musicians);
      const response = await app.service('musicians').find!({
        query: { roomId: 'room-id' },
      });

      expect(mockRedis.getMusicians).toHaveBeenCalledWith('room-id');
      expect(response).toEqual(_.values(musicians));
    });
  });

  describe('create', () => {
    it('requires the name to be present', async () => {
      expect.assertions(2);

      await expect(() =>
        app.service('musicians').create!({})
      ).rejects.toThrowError(BadRequest);
      await expect(() =>
        app.service('musicians').create!({ name: '' })
      ).rejects.toThrowError(BadRequest);
    });

    it('creates a musician', async () => {
      expect.assertions(2);

      const musician = {
        id: 'musician-id',
        name: 'My Musician',
        previousMusicianId: null,
      };
      mockRedis.createMusician.mockResolvedValue(musician);

      const response = await app.service('musicians').create!(
        { name: 'My Musician' },
        { query: { roomId: 'room-id' } }
      );

      expect(mockRedis.createMusician).toHaveBeenCalledWith(
        'room-id',
        'My Musician'
      );
      expect(response).toEqual(musician);
    });
  });
});
