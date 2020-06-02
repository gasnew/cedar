import createApp from '../../src/app';

const { Tedis } = jest.genMockFromModule('tedis');

describe("'rooms' service", () => {
  it('register the room service', () => {
    const app = createApp(new Tedis());

    const service = app.service('rooms');
    expect(service).toBeTruthy();
  });
});
