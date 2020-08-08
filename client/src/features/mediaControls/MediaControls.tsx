import React, { useContext, useState } from 'react';

import {
  Button,
  ButtonGroup,
  Card,
  Classes,
  Colors,
  Dialog,
  Divider,
  FormGroup,
  InputGroup,
  ControlGroup,
} from '@blueprintjs/core';
import { useDispatch, useSelector } from 'react-redux';

import { FeathersContext } from '../feathers/FeathersProvider';
import { useCreate } from '../feathers/FeathersHooks';
import { selectRoom } from '../room/roomSlice';
import {
  startRecording,
  selectRecordingState,
} from '../recording/recordingSlice';

export default function() {
  const app = useContext(FeathersContext);
  const room = useSelector(selectRoom);
  const recordingState = useSelector(selectRecordingState);
  const dispatch = useDispatch();

  const [createRecording, { error, loading }] = useCreate('recordings', {});

  const networkedStartRecording = async () => {
    const { error, data } = await createRecording();
    console.log(error);
    // NOTE(gnewman): Just return for now. Use a toast in the future?
    if (error || !data || !room.id) return;
    dispatch(startRecording(app, room.id, data.id));
  };

  const waitingToStart = loading || recordingState === 'initializing';

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
          onClick={() => console.log('starp')}
        >
          Stop
        </Button>
      </ButtonGroup>
    </Card>
  );
}
