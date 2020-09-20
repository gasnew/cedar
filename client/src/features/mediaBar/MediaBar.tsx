import React, { useContext, useEffect, useRef, useState } from 'react';

import {
  Button,
  ButtonGroup,
  Card,
  Divider,
  NumericInput,
  Tag,
} from '@blueprintjs/core';
import { useDispatch, useSelector } from 'react-redux';

import LoopbackLatency from './LoopbackLatency';
import MediaControls from './MediaControls';
import RecordingStateIndicator from './RecordingStateIndicator';
import { FeathersContext } from '../feathers/FeathersProvider';
import {
  useCreate,
  useGet,
  useLazyGet,
  usePatch,
} from '../feathers/FeathersHooks';
import { selectMusicians } from '../musicians/musiciansSlice';
import { selectAmHost, selectHostId, selectRoom } from '../room/roomSlice';
import {
  State as RecordingState,
  selectRecordingId,
  selectRecordingState,
  startRecording,
  stopRecording,
} from '../recording/recordingSlice';

export default function() {
  const amHost = useSelector(selectAmHost);
  const recordingState = useSelector(selectRecordingState);

  return (
    <Card
      style={{
        padding: 5,
        borderRadius: 0,
        display: 'flex',
        flexDirection: 'row',
      }}
      elevation={2}
    >
      {amHost ? (
        <MediaControls recordingState={recordingState} />
      ) : (
        <RecordingStateIndicator recordingState={recordingState} />
      )}
      <Divider />
      <LoopbackLatency disabled={recordingState !== 'stopped'} />
    </Card>
  );
}
