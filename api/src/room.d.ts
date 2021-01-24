// Declare all types that compose the data for a given Room here.

// Util definitions
export interface Collection<Model> {
  [id: string]: Model;
}

// Meta (not a collection)
export interface RoomMeta {
  id: string;
  name: string;
  recordingId: string | null;
  musicianIdsChain: string[];
  secondsBetweenMusicians: number;
}

// Model and Collection definitions
// A "Model" (e.g., Musician) in this case is like a SQL table--it represents
// the fields we care about for a given type of data.
// A "Collection" (e.g., Musicians) is an object containing all of the Models
// of a given type, indexed by ID
export interface Musician {
  id: string;
  roomId: string;
  name: string;
  active: boolean;
  loopbackLatencyMs: number | null;
}
export type Musicians = Collection<Musician>;

export type RecordingState = 'running' | 'stopped';
export interface Recording {
  id: string;
  state: RecordingState;
  trackIds: string[];
}
export type Recordings = Collection<Recording>;

export interface Track {
  id: string;
  musicianId: string;
  // data is stored in a separate Redis stream named `${roomId}:${trackId}. We
  // expect to only send small chunks of the track over the network in any
  // given request.
  data: string[];
  // NOTE(gnewman): Since we are storing track data in a Redis stream, we need
  // to keep track of the position of the last chunk of data we read--this is
  // the purpose of the cursor. A client will say something like, "Give me the
  // track data *after* cursor `1234-0`," then the server will query the Redis
  // stream: `XRANGE def456:abc123 1234-1 +` and return that data along with
  // whatever the new cursor is we get from Redis. Additionally, requiring the
  // cursor in PATCH calls allows us to make that endpoint idempotent because
  // the server will be able to compare the provided cursor with the
  // monotonically-increasing Redis-provided cursor.
  //
  // Read more about Redis streams and entry IDs here:
  // https://redis.io/topics/streams-intro#entry-ids
  cursor: string | null;
  // bufferHealthSeconds data is stored in a separate Redis stream named
  // `${roomId}:${trackId}:buffer-health-data`. This is an array of numbers
  // representing the minimum number of seconds of audio buffer the client has
  // available for playback at any given point. This stream runs at 60 Hz.
  bufferHealthSeconds: number[];
}
export type Tracks = Collection<Track>;

export interface Collections {
  musicians: Musicians;
  recordings: Recordings;
  tracks: Tracks;
}

// Room
export interface Room {
  meta: RoomMeta;
  collections: Collections;
}
