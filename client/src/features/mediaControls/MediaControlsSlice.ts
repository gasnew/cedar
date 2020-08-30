import { createSlice, PayloadAction } from '@reduxjs/toolkit';
import { RootState } from '../../app/store';

interface MediaControlsState {
  recording: boolean;
}

const initialState: MediaControlsState = {
  recording: false,
};

export const mediaControlsSlice = createSlice({
  name: 'mediaControls',
  initialState,
  reducers: {
    startRecording: (state, action: PayloadAction<void>) => {
      state.recording = true;
    },
    stopRecording: (state, action: PayloadAction<void>) => {
      state.recording = false;
    },
  },
});

export const { startRecording, stopRecording } = mediaControlsSlice.actions;

//export const selectIsRecording = (state: RootState) =>
  //state.mediaControls.recording;

export default mediaControlsSlice.reducer;
