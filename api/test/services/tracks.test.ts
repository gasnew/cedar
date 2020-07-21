import _ from 'lodash';
import { mock, mockClear } from 'jest-mock-extended';
import { BadRequest } from '@feathersjs/errors';

import createApp from '../../src/app';
import { Redis } from '../../src/models';

describe("'tracks' service", () => {
  const mockRedis = mock<Redis>();
  const app = createApp(mockRedis);

  beforeEach(() => mockClear(mockRedis));

  it('register the track service', () => {
    expect(app.service('tracks')).toBeTruthy();
  });

  describe('find', () => {
    it('creates a track', async () => {
      expect.assertions(3);

      const track1 = {
        id: 'track1-id',
        musicianId: 'musician1-id',
        data: [],
        cursor: '123-0',
      };
      const track2 = {
        id: 'track2-id',
        musicianId: 'musician2-id',
        data: [],
        cursor: '124-0',
      };
      mockRedis.getTrack.mockResolvedValueOnce(track1);
      mockRedis.getTrack.mockResolvedValueOnce(track2);

      const response = await app.service('tracks').find!({
        query: {
          roomId: 'room-id',
          cursorsByTrack: {
            'track1-id': '123-0',
            'track2-id': '124-0',
          },
        },
      });

      expect(mockRedis.getTrack).toHaveBeenCalledWith(
        'room-id',
        'track1-id',
        '123-0'
      );
      expect(mockRedis.getTrack).toHaveBeenCalledWith(
        'room-id',
        'track1-id',
        '123-0'
      );
      expect(response).toEqual([track1, track2]);
    });
  });

  describe('patch', () => {
    it('appends data to a track', async () => {
      expect.assertions(2);

      const track = {
        id: 'track-id',
        musicianId: 'musician-id',
        data: [],
        cursor: '123-0',
      };
      mockRedis.appendTrackData.mockResolvedValue(track);

      const response = await app.service('tracks').patch!(
        'track-id',
        { data: ['data'], cursor: '123-0' },
        { query: { roomId: 'room-id' } }
      );

      expect(mockRedis.appendTrackData).toHaveBeenCalledWith('room-id', {
        id: 'track-id',
        data: ['data'],
        cursor: '123-0',
      });
      expect(response).toEqual(track);
    });
  });
});
