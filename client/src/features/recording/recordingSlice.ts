import _ from 'lodash';
import { createSlice, PayloadAction } from '@reduxjs/toolkit';
import { CedarApp } from '../feathers/FeathersProvider';
import { AppThunk, RootState } from '../../app/store';
import { Track as ServerTrack } from '../../../../api/src/room';

interface Track {
  id: string;
  musicianId: string;
}
interface Recording {
  id: string;
  tracks: Track[];
}
type State = 'stopped' | 'initializing' | 'recording';
interface RecordingState {
  state: State;
  currentRecordingId: string | null;
  recordings: { [id: string]: Recording };
}

const initialState: RecordingState = {
  state: 'stopped',
  currentRecordingId: null,
  recordings: {},
};

export const roomSlice = createSlice({
  name: 'room',
  initialState,
  reducers: {
    setRecordingState: (state, action: PayloadAction<State>) => {
      state.state = action.payload;
    },
    addRecording: (state, action: PayloadAction<Recording>) => {
      state.currentRecordingId = action.payload.id;
      state.recordings[action.payload.id] = action.payload;
    },
    stopRecording: (state, action: PayloadAction<void>) => {
      state.currentRecordingId = null;
      state.state = 'stopped';
    },
  },
});

export const {
  setRecordingState,
  addRecording,
  stopRecording,
} = roomSlice.actions;

// The function below is called a thunk and allows us to perform async logic. It
// can be dispatched like a regular action: `dispatch(incrementAsync(10))`. This
// will call the thunk with the `dispatch` function as the first argument. Async
// code can then be executed and other actions can be dispatched
export const startRecording = (
  app: CedarApp,
  roomId: string,
  recordingId: string
): AppThunk => async dispatch => {
  dispatch(setRecordingState('initializing'));

  const recording = await app.service('recordings').get!(recordingId, {
    query: { roomId },
  });
  const tracks = (await app.service('tracks').find!({
    query: {
      roomId,
      cursorsByTrack: _.reduce(
        recording.trackIds,
        (tracks, trackId) => ({ ...tracks, [trackId]: null }),
        {}
      ),
    },
  })) as ServerTrack[];

  dispatch(
    addRecording({
      id: recording.id,
      tracks,
    })
  );
  dispatch(setRecordingState('recording'));
};

export const selectRecordingState = (state: RootState) => state.recording.state;
export const selectRecordingId = (state: RootState) =>
  state.recording.currentRecordingId;

export default roomSlice.reducer;
