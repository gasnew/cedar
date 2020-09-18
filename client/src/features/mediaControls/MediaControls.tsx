import React, { useContext, useEffect, useRef, useState } from 'react';

import { Button, ButtonGroup, Card, Tag } from '@blueprintjs/core';
import { useDispatch, useSelector } from 'react-redux';

import { FeathersContext } from '../feathers/FeathersProvider';
import {
  useCreate,
  useGet,
  useLazyGet,
  usePatch,
} from '../feathers/FeathersHooks';
import { selectAmHost, selectHostId, selectRoom } from '../room/roomSlice';
import {
  State as RecordingState,
  selectRecordingId,
  selectRecordingState,
  startRecording,
  stopRecording,
} from '../recording/recordingSlice';

function RecordingStateIndicator({
  recordingState,
}: {
  recordingState: RecordingState;
}) {
  const [hostName, setHostName] = useState<string | null>(null);

  const hostId = useSelector(selectHostId);
  const [getMusician] = useLazyGet('musicians', hostId || '');

  useEffect(
    () => {
      if (!hostId) setHostName(null);
      else
        getMusician().then(({ data, error }) => {
          if (!data) return;
          setHostName(data.name);
        });
    },
    [getMusician, hostId]
  );
  // NOTE(gnewman): We need this extra polling to account for name changes.
  // TODO: Store musician names in redux, so we can just subscribe to them
  // across the board.
  useGet(
    'musicians',
    hostId || '',
    {
      pollingInterval: 1000,
      onUpdate: ({ name }) => {
        if (name !== hostName) setHostName(name);
      },
    },
    true
  );

  return recordingState === 'stopped' ? (
    <span>
      <Tag large intent="primary">
        Stopped
      </Tag>
      <span style={{ fontStyle: 'italic', color: 'rgba(255, 255, 255, 0.6)' }}>
        &nbsp;{hostName ? (
          <span>
            Waiting for <span style={{ fontWeight: 'bold' }}>{hostName}</span>{' '}
            to start recording...
          </span>
        ) : (
          <span>No host set</span>
        )}
      </span>
    </span>
  ) : (
    <Tag large intent="danger">
      Recording
    </Tag>
  );
}

export default function() {
  const app = useContext(FeathersContext);
  const amHost = useSelector(selectAmHost);
  const room = useSelector(selectRoom);
  const recordingState = useSelector(selectRecordingState);
  const recordingId = useSelector(selectRecordingId);
  const dispatch = useDispatch();

  const [createRecording, { loading: createLoading }] = useCreate(
    'recordings',
    {}
  );
  const [patchRecording] = usePatch('recordings');

  const networkedStartRecording = async () => {
    const { error, data } = await createRecording();
    // NOTE(gnewman): Just return for now. Use a toast in the future?
    if (error || !data || !room.id) return;
    dispatch(startRecording(app, room.id, data.id));
  };
  const networkedStopRecording = async () => {
    const { error } = await patchRecording(recordingId, {
      state: 'stopped',
    });
    // NOTE(gnewman): Just return for now. Use a toast in the future?
    if (error) return;
    dispatch(stopRecording());
  };

  const waitingToStart = createLoading || recordingState === 'initializing';

  return (
    <Card style={{ padding: 5, borderRadius: 0 }} elevation={2}>
      {amHost ? (
        <ButtonGroup>
          <Button
            intent={recordingState === 'recording' ? 'none' : 'primary'}
            icon="record"
            loading={waitingToStart}
            disabled={recordingState !== 'stopped'}
            onClick={networkedStartRecording}
          >
            Record
          </Button>
          <Button
            intent={recordingState === 'stopped' ? 'none' : 'danger'}
            icon="stop"
            disabled={recordingState !== 'recording'}
            onClick={networkedStopRecording}
          >
            Stop
          </Button>
        </ButtonGroup>
      ) : (
        <RecordingStateIndicator recordingState={recordingState} />
      )}
    </Card>
  );
}
