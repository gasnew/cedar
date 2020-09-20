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

export default function({
  recordingState,
}: {
  recordingState: RecordingState;
}) {
  const hostId = useSelector(selectHostId);
  const musicians = useSelector(selectMusicians);
  const hostName = hostId && musicians[hostId] ? musicians[hostId].name : null;

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
