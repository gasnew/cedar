import _ from 'lodash';
import { createSlice, PayloadAction } from '@reduxjs/toolkit';
import { RootState } from '../../app/store';

export interface RoomState {
  id: string | null;
  name: string | null;
  musicianId: string | null;
  musicianIdsChain: string[];
  secondsBetweenMusicians: number;
}

const initialState: RoomState = {
  id: null, // || 'a3de76a2-b5ac-4621-a80d-3b54a346b4b0',
  name: null, // || 'asdf',
  musicianId: null, // || '21ceca69-da4b-4674-99c2-41308906f59b',
  musicianIdsChain: [],
  secondsBetweenMusicians: 0.8,
};

export const roomSlice = createSlice({
  name: 'room',
  initialState,
  reducers: {
    // Use the PayloadAction type to declare the contents of `action.payload`
    setRoom: (
      state,
      action: PayloadAction<{ id: string; name: string; musicianId: string }>
    ) => {
      // Redux Toolkit allows us to write "mutating" logic in reducers. It
      // doesn't actually mutate the state because it uses the Immer library,
      // which detects changes to a "draft state" and produces a brand new
      // immutable state based off those changes
      state.id = action.payload.id;
      state.name = action.payload.name;
      state.musicianId = action.payload.musicianId;
    },
    updateChain: (
      state,
      action: PayloadAction<{ musicianIdsChain: string[] }>
    ) => {
      state.musicianIdsChain = action.payload.musicianIdsChain;
    },
    setSecondsBetweenMusicians: (
      state,
      action: PayloadAction<{ secondsBetweenMusicians: number }>
    ) => {
      state.secondsBetweenMusicians = action.payload.secondsBetweenMusicians;
    },
  },
});

export const {
  setRoom,
  setSecondsBetweenMusicians,
  updateChain,
} = roomSlice.actions;

// The function below is called a selector and allows us to select a value from
// the state. Selectors can also be defined inline where they're used instead
// of in the slice file. For example: `useSelector((state: RootState) =>
// state.room)`
export const selectRoom = (state: RootState) => state.room;
export const selectMusicianIdsChain = (state: RootState) =>
  state.room.musicianIdsChain;
export const selectPrecedingMusicianIds = (state: RootState) => {
  const musicianId = state.room.musicianId;
  if (!musicianId || !_.includes(state.room.musicianIdsChain, musicianId))
    return [];
  return _.takeWhile(state.room.musicianIdsChain, id => id !== musicianId);
};
export const selectSecondsBetweenMusicians = (state: RootState) =>
  state.room.secondsBetweenMusicians;
export const selectHostId = (state: RootState) =>
  state.room.musicianIdsChain.length > 0
    ? state.room.musicianIdsChain[0]
    : null;
export const selectAmHost = (state: RootState) =>
  state.room.musicianIdsChain.length > 0 &&
  state.room.musicianId === state.room.musicianIdsChain[0];
export const selectAmInChain = (state: RootState) =>
  state.room.musicianIdsChain.indexOf(state.room.musicianId || '') !== -1;

export default roomSlice.reducer;
