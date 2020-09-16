import { createSlice, PayloadAction } from '@reduxjs/toolkit';
import { RootState } from '../../app/store';

export interface RoomState {
  id: string | null;
  name: string | null;
  musicianId: string | null;
  musicianIdsChain: string[];
}

const initialState: RoomState = {
  id: null,// || '86b04b3e-8162-45a8-932b-0f5522712d9c',
  name: null,// || 'Test',
  musicianId: null,// || '52f7195c-8856-48b6-9b13-faa061428cd7',
  musicianIdsChain: [],
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
  },
});

export const { setRoom, updateChain } = roomSlice.actions;

// The function below is called a selector and allows us to select a value from
// the state. Selectors can also be defined inline where they're used instead
// of in the slice file. For example: `useSelector((state: RootState) =>
// state.room)`
export const selectRoom = (state: RootState) => state.room;
export const selectMusicianIdsChain = (state: RootState) => state.room.musicianIdsChain;

export default roomSlice.reducer;
