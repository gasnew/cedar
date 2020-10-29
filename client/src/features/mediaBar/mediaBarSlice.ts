import { createSlice, PayloadAction } from '@reduxjs/toolkit';
import { RootState } from '../../app/store';

interface MediaBarState {
  loopbackLatencyMs: number | null;
}

const initialState: MediaBarState = {
  loopbackLatencyMs: null,
};

export const mediaBarSlice = createSlice({
  name: 'mediaBar',
  initialState,
  reducers: {
    setLoopbackLatencyMs: (
      state,
      action: PayloadAction<{ loopbackLatencyMs: number }>
    ) => {
      state.loopbackLatencyMs = action.payload.loopbackLatencyMs;
    },
  },
});

export const { setLoopbackLatencyMs } = mediaBarSlice.actions;

export const selectLoopbackLatencyMs = (state: RootState) =>
  state.mediaBar.loopbackLatencyMs;

export default mediaBarSlice.reducer;
