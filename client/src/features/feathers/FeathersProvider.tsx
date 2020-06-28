import feathers, { Application as FeathersApp, } from '@feathersjs/feathers';
import feathersSocketIO from '@feathersjs/socketio-client';
import React, { createContext } from 'react';
import socketIO from 'socket.io-client';
import { ServiceTypes } from '../../../../api/src/declarations';

// NOTE(gnewman): The `feathers()` default here is required but is never used.
export const FeathersContext = createContext<FeathersApp<ServiceTypes>>(
  feathers()
);

export function FeathersProvider({ children }: { children: React.ReactNode }) {
  // Set up Socket.io client with the socket
  const app: FeathersApp<ServiceTypes> = feathers();
  // TODO(gnewman): Let's put this in an env variable someday
  app.configure(feathersSocketIO(socketIO('http://localhost:3030')));

  return (
    <FeathersContext.Provider value={app}>{children}</FeathersContext.Provider>
  );
}
