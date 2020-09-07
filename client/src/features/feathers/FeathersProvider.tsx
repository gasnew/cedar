import feathers, { Application as FeathersApp } from '@feathersjs/feathers';
import feathersSocketIO from '@feathersjs/socketio-client';
import React, { createContext } from 'react';
import socketIO from 'socket.io-client';

import { getEnv } from '../../app/util';
import { ServiceTypes } from '../../../../api/src/declarations';

export type CedarApp = FeathersApp<ServiceTypes>;
// NOTE(gnewman): The `feathers()` default here is required but is never used.
export const FeathersContext = createContext<CedarApp>(feathers());

export function FeathersProvider({ children }: { children: React.ReactNode }) {
  // Set up Socket.io client with the socket
  const app: FeathersApp<ServiceTypes> = feathers();
  app.configure(feathersSocketIO(socketIO(getEnv('API_URL'))));

  return (
    <FeathersContext.Provider value={app}>{children}</FeathersContext.Provider>
  );
}
