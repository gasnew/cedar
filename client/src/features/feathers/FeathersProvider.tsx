import feathers, { Application as FeathersApp } from '@feathersjs/feathers';
import feathersSocketIO from '@feathersjs/socketio-client';
import React, { createContext, useEffect, useMemo, useState } from 'react';
import { useSelector } from 'react-redux';
import socketIO from 'socket.io-client';

import { getEnv } from '../../app/util';
import { selectMusicianId, selectRoomId } from '../room/roomSlice';
import { ServiceTypes } from '../../../../api/src/declarations';

export type CedarApp = FeathersApp<ServiceTypes>;

// NOTE(gnewman): The `feathers()` default here is required but is never used.
export const FeathersContext = createContext<CedarApp>(feathers());

export function FeathersProvider({ children }: { children: React.ReactNode }) {
  const [connected, setConnected] = useState(false);
  const musicianId = useSelector(selectMusicianId);
  const roomId = useSelector(selectRoomId);

  // Set up Socket.io client with the socket
  const socketIOClient = useMemo(() => socketIO(getEnv('API_URL')), []);
  const app: FeathersApp<ServiceTypes> = useMemo(
    () => {
      const app = feathers();
      app.configure(feathersSocketIO(socketIOClient));
      return app;
    },
    [socketIOClient]
  );

  useEffect(
    () => {
      socketIOClient.on('connect', () => setConnected(true));
      socketIOClient.on('disconnect', () => setConnected(false));
    },
    [socketIOClient]
  );

  useEffect(
    () => {
      // NOTE(gnewman): Just a quick hack to re-activate the musician if the
      // client still knows the musician ID. The server automatically marks the
      // musician as inactive if it loses its websocket connection, so we need
      // to do this in case we lost then regained connection.
      if (connected && musicianId && roomId) {
        app.service('musicians').patch!(
          musicianId,
          {
            active: true,
          },
          { query: { roomId: roomId } }
        );
      }
    },
    [app, connected, musicianId, roomId]
  );

  return (
    <FeathersContext.Provider value={app}>{children}</FeathersContext.Provider>
  );
}
