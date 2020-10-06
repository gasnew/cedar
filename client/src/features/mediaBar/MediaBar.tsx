import React from 'react';

import {
  Card,
  Divider,
} from '@blueprintjs/core';
import { useSelector } from 'react-redux';

import LoopbackLatency from './LoopbackLatency';
import MediaControls from './MediaControls';
import RecordingStateIndicator from './RecordingStateIndicator';
import { selectAmHost } from '../room/roomSlice';
import {
  selectRecordingState,
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
