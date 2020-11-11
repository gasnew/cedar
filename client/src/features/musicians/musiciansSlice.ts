import _ from 'lodash';
import { createSlice, PayloadAction } from '@reduxjs/toolkit';
import { RootState } from '../../app/store';

export interface Musician {
  id: string;
  name: string;
  loopbackLatencyMs: number | null;
  active: boolean;
}
interface Musicians {
  [id: string]: Musician;
}
interface MusiciansState {
  musicians: Musicians;
}

const initialState: MusiciansState = {
  musicians: {},
};

export const musiciansSlice = createSlice({
  name: 'musicians',
  initialState,
  reducers: {
    addMusicians: (state, action: PayloadAction<Musicians>) => {
      state.musicians = { ...action.payload, ...state.musicians };
    },
    updateMusicians: (state, action: PayloadAction<Musicians>) => {
      _.each(action.payload, musician => {
        state.musicians[musician.id].name = musician.name;
        state.musicians[musician.id].loopbackLatencyMs =
          musician.loopbackLatencyMs;
        state.musicians[musician.id].active =
          musician.active;
      });
    },
    setMusicianName: (
      state,
      action: PayloadAction<{ musicianId: string; name: string }>
    ) => {
      const {
        payload: { musicianId, name },
      } = action;
      if (!state.musicians[musicianId]) return;
      state.musicians[musicianId].name = name;
    },
    setMusicianLoopbackLatencyMs: (
      state,
      action: PayloadAction<{ musicianId: string; loopbackLatencyMs: number }>
    ) => {
      const {
        payload: { musicianId, loopbackLatencyMs },
      } = action;
      if (!state.musicians[musicianId]) return;
      state.musicians[musicianId].loopbackLatencyMs = loopbackLatencyMs;
    },
  },
});

export const {
  addMusicians,
  setMusicianLoopbackLatencyMs,
  setMusicianName,
  updateMusicians,
} = musiciansSlice.actions;

export const selectMusicians = (state: RootState) => state.musicians.musicians;

export default musiciansSlice.reducer;
