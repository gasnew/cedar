import _ from 'lodash';
import React, {
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
} from 'react';
import { useDispatch, useSelector } from 'react-redux';
import {
  Alignment,
  Button,
  Classes,
  Colors,
  EditableText,
  H4,
  Icon,
  Navbar,
  NavbarDivider,
  NavbarGroup,
  NavbarHeading,
  Popover,
} from '@blueprintjs/core';

import { useInterval } from '../../app/util';
import {
  useGet,
  useLazyGet,
  usePatch,
  useSubscription,
} from '../feathers/FeathersHooks';
import { FeathersContext } from '../feathers/FeathersProvider';
import { selectMusicians, setMusicianName } from '../musicians/musiciansSlice';
import Help from './Help';
import './Navbar.css';
import {
  RoomState,
  selectAmHost,
  selectRoom,
  setSecondsBetweenMusicians,
  updateChain,
} from '../room/roomSlice';
import {
  selectRecordingState,
  startRecording,
  stopRecording,
} from '../recording/recordingSlice';

function RecordingIcon() {
  const [bright, setBright] = useState(true);
  useInterval(() => setBright(!bright), 1000 / 2);

  return <Icon icon="record" color={bright ? Colors.RED4 : Colors.RED3} />;
}

function RoomNameplate({
  id,
  name,
  room,
}: {
  id: string;
  name: string;
  room: RoomState;
}) {
  const app = useContext(FeathersContext);
  const dispatch = useDispatch();
  const recordingState = useSelector(selectRecordingState);
  const amHost = useSelector(selectAmHost);

  // Used to block calling startRecording twice in case of subscription and
  // polling race condition
  const isRecordingRef = useRef(false);

  const maybeStartRecording = (recordingId: string) => {
    if (isRecordingRef.current) return;
    dispatch(startRecording(app, id, recordingId));
    isRecordingRef.current = true;
  };
  useEffect(
    () => {
      if (recordingState === 'stopped') isRecordingRef.current = false;
    },
    [recordingState]
  );

  useSubscription('recordings', 'created', recording => {
    if (recordingState === 'stopped') maybeStartRecording(recording.id);
  });

  useGet(
    'rooms',
    id,
    {
      pollingInterval: 1000,
      // Keep recordingId up-to-date (indicates whether the server expects us to
      // be recording)
      onUpdate: ({
        recordingId,
        musicianIdsChain,
        secondsBetweenMusicians,
      }) => {
        if (!amHost) {
          if (recordingId && recordingState === 'stopped')
            maybeStartRecording(recordingId);
          if (!recordingId && recordingState === 'recording')
            dispatch(stopRecording());
          if (secondsBetweenMusicians !== room.secondsBetweenMusicians)
            dispatch(setSecondsBetweenMusicians({ secondsBetweenMusicians }));
        }
        if (!_.isEqual(musicianIdsChain, room.musicianIdsChain))
          dispatch(updateChain({ musicianIdsChain }));
      },
    },
    true
  );

  return (
    <Popover
      popoverClassName={Classes.POPOVER_CONTENT_SIZING}
      modifiers={{
        arrow: { enabled: true },
        flip: { enabled: true },
        keepTogether: { enabled: true },
        preventOverflow: { enabled: true },
      }}
    >
      <Button minimal text={name} />
      <div>
        <H4>Room Info</H4>
        <p>
          <span style={{ fontWeight: 'bold' }}>Name: </span> {name}
        </p>
        <p>
          <span style={{ fontWeight: 'bold' }}>ID: </span> {id}
        </p>
      </div>
    </Popover>
  );
}

function MusianName() {
  const { musicianId } = useSelector(selectRoom);
  const musicians = useSelector(selectMusicians);
  const cachedName =
    musicianId && musicians[musicianId] ? musicians[musicianId].name : null;

  const [canonicalName, setCanonicalName] = useState(cachedName);

  const [getMusician] = useLazyGet('musicians', musicianId || '');
  const [patchMusician] = usePatch('musicians');

  const dispatch = useDispatch();
  const setCachedName = useCallback(
    (name: string | null) => {
      if (musicianId && name !== null)
        dispatch(setMusicianName({ musicianId, name }));
    },
    [musicianId, dispatch]
  );

  useEffect(
    () => {
      if (!musicianId) return;
      getMusician().then(({ data, error }) => {
        if (!data) return;
        setCachedName(data.name);
        setCanonicalName(data.name);
      });
    },
    [getMusician, musicianId, setCachedName]
  );

  return (
    <EditableText
      value={cachedName || ''}
      placeholder="Loading..."
      disabled={cachedName === null}
      onChange={setCachedName}
      onCancel={() => setCachedName(canonicalName)}
      onConfirm={() => {
        if (cachedName === '') setCachedName(canonicalName);
        else {
          setCanonicalName(cachedName);
          patchMusician(musicianId, { name: cachedName });
        }
      }}
    />
  );
}

export default function() {
  const recordingState = useSelector(selectRecordingState);
  const room = useSelector(selectRoom);

  return (
    <Navbar>
      <NavbarGroup align={Alignment.LEFT}>
        <NavbarHeading style={{ position: 'relative' }}>
          <span
            style={{
              position: 'relative',
              top: -3,
              left: 0,
            }}
          >
            newerest cedar
          </span>
          <span
            style={{
              position: 'absolute',
              fontSize: 8,
              fontStyle: 'italic',
              top: 13,
              left: 25,
            }}
          >
            alpha
          </span>
        </NavbarHeading>
        <NavbarDivider />
        <Help />
        {recordingState === 'recording' && <RecordingIcon />}
        {room.id &&
          room.name && (
            <RoomNameplate id={room.id} name={room.name} room={room} />
          )}
      </NavbarGroup>
      <NavbarGroup align={Alignment.RIGHT}>
        <MusianName />
      </NavbarGroup>
    </Navbar>
  );
}
