import { createSlice, PayloadAction } from '@reduxjs/toolkit';
import { RootState } from '../../app/store';

export interface IInputDevice {
  deviceId: string;
  groupId: string;
  label: string;
}

interface AudioState {
  inputDevice: IInputDevice | null;
}

const initialState: AudioState = {
  inputDevice: null,
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
  },
});

export const { setInputDevice } = audioSlice.actions;

export const selectInputDevice = (state: RootState) =>
  state.audio.inputDevice;

export default audioSlice.reducer;
