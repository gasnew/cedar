import { configureStore, ThunkAction, Action } from '@reduxjs/toolkit';
import roomReducer from '../features/room/roomSlice';
import recordingReducer from '../features/recording/recordingSlice';

export const store = configureStore({
  reducer: {
    room: roomReducer,
    recording: recordingReducer,
  },
});

export type RootState = ReturnType<typeof store.getState>;
export type AppThunk<ReturnType = void> = ThunkAction<
  ReturnType,
  RootState,
  unknown,
  Action<string>
>;
