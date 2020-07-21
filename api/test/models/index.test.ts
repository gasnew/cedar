import _ from 'lodash';
import IORedis from 'ioredis';
import { v4 as uuidv4 } from 'uuid';
import { mocked } from 'ts-jest/utils';
import { Unprocessable } from '@feathersjs/errors';

import { withHelpers } from '../../src/models';

jest.mock('uuid');
const MockIORedis = jest.genMockFromModule<typeof IORedis.prototype>('ioredis');

describe('withHelpers', () => {
  it('returns an IORedis instance with some new methods', () => {
    const client = withHelpers(new MockIORedis());

    expect(client).toBeInstanceOf(MockIORedis);
    expect(client.getMusicians).toBeDefined();
    expect(client.createMusician).toBeDefined();
  });
});
