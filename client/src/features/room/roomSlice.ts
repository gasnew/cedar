import { createSlice, PayloadAction } from '@reduxjs/toolkit';
import { RootState } from '../../app/store';
import { setRecordingState, addRecording } from '../recording/recordingSlice';

export interface RoomState {
  id: string | null;
  name: string | null;
  musicianId: string | null;
  musicianIdsChain: string[];
}

const initialState: RoomState = {
  id: null,
  name: null,
  musicianId: null,
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

export default roomSlice.reducer;
