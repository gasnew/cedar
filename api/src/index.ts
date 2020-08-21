import IORedis from 'ioredis';

import logger from './logger';
import createApp from './app';
import { withHelpers } from './models';

const app = createApp(withHelpers(new IORedis()));
const port = app.get('port');
const server = app.listen(port);

process.on('unhandledRejection', (reason, p) =>
  logger.error('Unhandled Rejection at: Promise ', p, reason)
);

server.on('listening', () =>
  logger.info(
    'Feathers application started on http://%s:%d',
    app.get('host'),
    port
  )
);
