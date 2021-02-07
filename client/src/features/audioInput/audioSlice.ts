import { createSlice, PayloadAction } from '@reduxjs/toolkit';
import { RootState } from '../../app/store';

export interface IInputDevice {
  deviceId: string;
  groupId: string;
  label: string;
}
export interface IOutputDevice {
  deviceId: string;
  groupId: string;
  kind: string;
  label: string;
}

interface AudioState {
  inputDevice: IInputDevice | null;
  outputDevice: IOutputDevice | null;
}

const initialState: AudioState = {
  inputDevice: null,
  outputDevice: null,
};

export const audioSlice = createSlice({
  name: 'audio',
  initialState,
  reducers: {
    setInputDevice: (
      state,
      action: PayloadAction<IInputDevice>
    ) => {
      state.inputDevice = action.payload;
    },
    setOutputDevice: (
      state,
      action: PayloadAction<IOutputDevice>
    ) => {
      state.outputDevice = action.payload;
    },
  },
});

export const { setInputDevice, setOutputDevice } = audioSlice.actions;

export const selectInputDevice = (state: RootState) =>
  state.audio.inputDevice;
export const selectOutputDevice = (state: RootState) =>
  state.audio.outputDevice;

export default audioSlice.reducer;
