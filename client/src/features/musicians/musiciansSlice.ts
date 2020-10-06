import _ from 'lodash';
import { createSlice, PayloadAction } from '@reduxjs/toolkit';
import { RootState } from '../../app/store';

interface Musician {
  id: string;
  name: string;
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
      _.each(
        action.payload,
        musician => (state.musicians[musician.id].name = musician.name)
      );
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
  },
});

export const {
  addMusicians,
  setMusicianName,
  updateMusicians,
} = musiciansSlice.actions;

export const selectMusicians = (state: RootState) => state.musicians.musicians;

export default musiciansSlice.reducer;
