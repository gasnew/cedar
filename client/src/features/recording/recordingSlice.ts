import _ from 'lodash';
import { createSlice, PayloadAction } from '@reduxjs/toolkit';
import { CedarApp } from '../feathers/FeathersProvider';
import { updateChain } from '../room/roomSlice';
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
  // This state is for UI elements to indicate something exciting is happening
  dispatch(setRecordingState('initializing'));

  // Update our redux state so every component subscribing to recording-related
  // data gets correct, up-to-date data, even if we're polling/subscribing to
  // this data elsewhere
  const room = await app.service('rooms').get!(roomId);
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

  dispatch(updateChain(room));
  dispatch(
    addRecording({
      id: recording.id,
      tracks,
    })
  );

  // Indicate that the data is all set, and we're ready to record
  dispatch(setRecordingState('recording'));
};

export const selectRecordingState = (state: RootState) => state.recording.state;
export const selectRecordingId = (state: RootState) =>
  state.recording.currentRecordingId;
const selectCurrentRecording = (state: RootState) => {
  const recordingId = state.recording.currentRecordingId;
  if (!recordingId) return null;
  return state.recording.recordings[recordingId] || null;
};
export const selectMyTrackId = (state: RootState) => {
  const recording = selectCurrentRecording(state);
  if (!recording) return null;
  const track = _.find(recording.tracks, ['musicianId', state.room.musicianId]);
  return track ? track.id : null;
};
export const selectRecordingDelaySeconds = (state: RootState) => {
  // Delay each musician by 1 second
  const index = state.room.musicianIdsChain.indexOf(
    state.room.musicianId || ''
  );
  return index === -1 ? 0 : index * 5;
};

export const selectCurrentTracks = (state: RootState) => {
  const recording = selectCurrentRecording(state);
  if (!recording) return [];
  return recording.tracks;
};
export const selectPrecedingTracks = (state: RootState): Track[] => {
  const musicianId = state.room.musicianId;
  if (!musicianId) return [];
  const precedingMusicians = _.takeWhile(
    state.room.musicianIdsChain,
    id => id !== musicianId
  );
  const currentTracks = selectCurrentTracks(state);
  const precedingTracks = _.map(precedingMusicians, id =>
    _.find(currentTracks, track => track.musicianId === id)
  );
  if (_.some(precedingTracks, track => track === undefined)) return [];
  //return currentTracks;
  return precedingTracks as Track[];
};

export default roomSlice.reducer;
