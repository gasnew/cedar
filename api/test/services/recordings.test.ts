import _ from 'lodash';
import { mock, mockClear } from 'jest-mock-extended';
import { BadRequest } from '@feathersjs/errors';

import createApp from '../../src/app';
import { Redis } from '../../src/models';

describe("'recordings' service", () => {
  const mockRedis = mock<Redis>();
  const app = createApp(mockRedis);

  beforeEach(() => mockClear(mockRedis));

  it('register the recording service', () => {
    expect(app.service('recordings')).toBeTruthy();
  });

  describe('create', () => {
    it('creates a recording', async () => {
      expect.assertions(2);

      const recording = {
        id: 'recording-id',
        state: 'running',
        trackIds: ['track-1', 'track-2'],
      };
      mockRedis.createRecording.mockResolvedValue(recording);

      const response = await app.service('recordings').create!(
        {},
        { query: { roomId: 'room-id' } }
      );

      expect(mockRedis.createRecording).toHaveBeenCalledWith('room-id');
      expect(response).toEqual(recording);
    });
  });
});
