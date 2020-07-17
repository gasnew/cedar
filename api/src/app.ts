import path from 'path';
import favicon from 'serve-favicon';
import compress from 'compression';
import helmet from 'helmet';
import cors from 'cors';

import feathers from '@feathersjs/feathers';
import configuration from '@feathersjs/configuration';
import express from '@feathersjs/express';
import socketio from '@feathersjs/socketio';

import { Application } from './declarations';
import logger from './logger';
import middleware from './middleware';
import services from './services';
import appHooks from './app.hooks';
import { Redis, connectToRedis } from './models';
//import channels from './channels';

export default function(redisClient: Redis) {
  const app: Application = connectToRedis(express(feathers()), redisClient);

  // Load app configuration
  app.configure(configuration());
  // Enable security, CORS, compression, favicon and body parsing
  app.use(helmet());
  app.use(cors());
  app.use(compress());
  app.use(express.json());
  app.use(express.urlencoded({ extended: true }));
  app.use(favicon(path.join(app.get('public'), 'favicon.ico')));
  // Host the public folder
  app.use('/', express.static(app.get('public')));

  // Set up Plugins and providers
  app.configure(express.rest());
  app.configure(socketio());

  // Configure other middleware (see `middleware/index.js`)
  app.configure(middleware);
  // Set up our services (see `services/index.js`)
  app.configure(services);
  // Set up event channels (see channels.js)
  // TODO(gnewman): Start using channels for the client to subscribe to events
  // like when recording starts
  //app.configure(channels);

  // Configure a middleware for 404s and the error handler
  app.use(express.notFound());
  app.use(express.errorHandler({ logger } as any));

  app.hooks(appHooks);

  return app;
}
