import { mock, mockClear } from 'jest-mock-extended';
import { BadRequest } from '@feathersjs/errors';

import createApp from '../../src/app';
import { Redis } from '../../src/models';

describe("'rooms' service", () => {
  const mockRedis = mock<Redis>();
  const app = createApp(mockRedis);

  beforeEach(() => mockClear(mockRedis));

  it('register the room service', () => {
    expect(app.service('rooms')).toBeTruthy();
  });

  describe('get', () => {
    it('returns a room', async () => {
      expect.assertions(2);

      const room = {
        id: 'room-id',
        name: 'My Room',
      };
      mockRedis.getRoom.mockResolvedValue(room);
      const response = await app.service('rooms').get!('room-id');

      expect(mockRedis.getRoom).toHaveBeenCalledWith('room-id');
      expect(response).toEqual(room);
    });
  });

  describe('create', () => {
    it('requires the name to be present', async () => {
      expect.assertions(2);

      await expect(() => app.service('rooms').create!({})).rejects.toThrowError(
        BadRequest
      );
      await expect(() =>
        app.service('rooms').create!({ name: '' })
      ).rejects.toThrowError(BadRequest);
    });

    it('creates a room', async () => {
      expect.assertions(2);

      const room = {
        id: 'room-id',
        name: 'My Room',
      };
      mockRedis.createRoom.mockResolvedValue(room);
      const response = await app.service('rooms').create!({ name: 'My Room' });

      expect(mockRedis.createRoom).toHaveBeenCalledWith('My Room');
      expect(response).toEqual(room);
    });
  });
});
