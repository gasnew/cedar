import React, { useContext } from 'react';

import { Button, ButtonGroup, Card } from '@blueprintjs/core';
import { useDispatch, useSelector } from 'react-redux';

import { FeathersContext } from '../feathers/FeathersProvider';
import { useCreate, usePatch } from '../feathers/FeathersHooks';
import { selectRoom } from '../room/roomSlice';
import {
  selectRecordingId,
  selectRecordingState,
  startRecording,
  stopRecording,
} from '../recording/recordingSlice';

export default function() {
  const app = useContext(FeathersContext);
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
    </Card>
  );
}
