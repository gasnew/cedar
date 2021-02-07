import {
  combineReducers,
  configureStore,
  getDefaultMiddleware,
  ThunkAction,
  Action,
} from '@reduxjs/toolkit';
import { persistStore, persistReducer } from 'redux-persist';
import storage from 'redux-persist/lib/storage'; // defaults to localStorage for web
import audioSliceReducer from '../features/audioInput/audioSlice';
import mediaBarReducer from '../features/mediaBar/mediaBarSlice';
import musiciansReducer from '../features/musicians/musiciansSlice';
import roomReducer from '../features/room/roomSlice';
import recordingReducer from '../features/recording/recordingSlice';

// NOTE(gnewman): We use sessionStorage so that we can tell redux-persist to
// key off of all tabs uniquely. This means we can open new tabs that get fresh
// redux states but can still have data persist on reload. Same for electron
// windows.
const tabID = sessionStorage.tabID
  ? sessionStorage.tabID
  : (sessionStorage.tabID = Math.random());
const persistConfig = {
  key: tabID,
  storage,
};
export const store = configureStore({
  reducer: persistReducer(
    persistConfig,
    combineReducers({
      audio: audioSliceReducer,
      mediaBar: mediaBarReducer,
      musicians: musiciansReducer,
      room: roomReducer,
      recording: recordingReducer,
    })
  ),
  middleware: getDefaultMiddleware({
    // NOTE(gnewman): Sadly, we need to turn off this check because of
    // redux-persist :P. Generally, though, we only want to put serializable
    // data into Redux.
    serializableCheck: false,
  }),
});
export const persistor = persistStore(store);

export type RootState = ReturnType<typeof store.getState>;
export type AppThunk<ReturnType = void> = ThunkAction<
  ReturnType,
  RootState,
  unknown,
  Action<string>
>;
