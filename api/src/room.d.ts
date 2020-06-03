// Declare all types that compose the data for a given Room here.

// Util definitions
export interface Collection<Model> {
  [id: string]: Model;
}

// Meta (not a collection)
export interface RoomMeta {
  id: string;
  name: string;
}

// Model and Collection definitions
// A "Model" (e.g., Musician) in this case is like a SQL table--it represents
// the fields we care about for a given type of data.
// A "Collection" (e.g., Musicians) is an object containing all of the Models
// of a given type, indexed by ID
export interface Musician {
  id: string;
  name: string;
  previousMusicianId: string | null,
}
export type Musicians = Collection<Musician>

export interface Collections {
  musicians: Musicians;
}

// Room
export interface Room {
  meta: RoomMeta;
  collections: Collections;
}
