import '@feathersjs/transport-commons';
import { HookContext } from '@feathersjs/feathers';
import _ from 'lodash';

import { Application } from '../declarations';
import { Musician } from '../room.d';

export default function(app: Application) {
  /* Track musician ID and room ID on each WebSocket connection, and
   * "deactivate" the corresponding musician if the connection closes.
   *
   * This implementation is Good Enough for the time being. There are three
   * main cases that this solution does well at:
   *
   * 1. Client dies and loses connection => musician marked as inactive.
   *
   * 2. Client loses connection for any other reason => musician marked as
   * inactive. There's client-side code to reactivate the musician when the
   * connection is re-established (the server can't know what musician a new
   * connection might correspond to).
   *
   * 3. Server dies and loses connection => client establishes a new connection
   * with another server, and musician remains active.
   *
   * However, there is a fourth:
   *
   * 4. Server and client die at the same time => musician remains "active"
   * even though the client isn't coming back.
   *
   * This fourth case ought to be the least likely of the four, but we're not
   * really handling it. A mitigation would be to allow a room host to "kick"
   * people, useful for when this same bug occurs in Zoom. Or we could
   * implement a heartbeat system, where the server deactivates musicians that
   * don't say "I'm alive" for too long; but that gives the server a more
   * active role than I'm comfortable with at the moment (this middleware
   * already crosses the line for me a bit).
   */

  if (typeof app.channel !== 'function') {
    // If no real-time functionality has been configured just return
    return;
  }

  function registerConnectionWithMusician({ id}: Musician, options: any) {
    // We assume that a client is only responsible for one musician at a time.
    // If the client switches rooms, it should mark the previous room's
    // musician as inactive before creating the new one.
    const connection = options.params.connection;
    if (!connection)
      return;

    connection.musicianId = id;
    connection.roomId = options.params.query.roomId;
  }
  // NOTE(gnewman): When a client joins a room, they either create or update
  // (activate) a musician. These functions are idempotent, so it's OK if
  // they're called extraneously.
  app.service('musicians').on('created', registerConnectionWithMusician);
  app.service('musicians').on('patched', registerConnectionWithMusician);

  app.on('disconnect', async (connection: any) => {
    const musicianId = connection.musicianId;
    const roomId = connection.roomId;

    // Connections don't always have musicians attached, e.g., before
    // creating/joining a room.
    if (musicianId && roomId) {
      // Deactivate musician
      await app.service('musicians').patch!(
        musicianId,
        { active: false },
        { query: { roomId } }
      );

      // Chain-specific mutations
      const { musicianIdsChain, recordingId } = await app.service('rooms').get!(
        roomId
      );
      if (_.includes(musicianIdsChain, musicianId)) {
        if (!recordingId) {
          // Remove the musician from the chain if not recording
          await app.service('rooms').patch!(
            roomId,
            {
              musicianIdsChain: _.without(musicianIdsChain, musicianId),
            },
            { query: { roomId } }
          );
        } else if (musicianIdsChain[0] === musicianId) {
          // Stop the recording, and remove from the chain if root musician
          await app.service('recordings').patch!(
            recordingId,
            {
              state: 'stopped',
            },
            { query: { roomId } }
          );
          await app.service('rooms').patch!(
            roomId,
            {
              musicianIdsChain: _.without(musicianIdsChain, musicianId),
            },
            { query: { roomId } }
          );
        }
      }
    }
  });
}
