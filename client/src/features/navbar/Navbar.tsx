import React, { useContext, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import {
  Alignment,
  Button,
  Classes,
  Colors,
  H4,
  Icon,
  Navbar,
  NavbarDivider,
  NavbarGroup,
  NavbarHeading,
  Popover,
} from '@blueprintjs/core';

import { useInterval } from '../../app/util';
import { useGet } from '../feathers/FeathersHooks';
import { FeathersContext } from '../feathers/FeathersProvider';
import { selectRoom } from '../room/roomSlice';
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

function RoomNameplate({ id, name }: { id: string; name: string }) {
  const app = useContext(FeathersContext);
  const dispatch = useDispatch();
  const recordingState = useSelector(selectRecordingState);

  const remoteRoom = useGet('rooms', id, {
    pollingInterval: 1000,
    // Keep recordingId up-to-date (indicates whether the server expects us to
    // be recording)
    // TODO: Add a check that I am not the host
    onUpdate: ({ recordingId }) => {
      if (recordingId && recordingState === 'stopped')
        dispatch(startRecording(app, id, recordingId));
      if (!recordingId && recordingState === 'recording')
        dispatch(stopRecording());
    },
  });

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

export default function() {
  const recordingState = useSelector(selectRecordingState);
  const room = useSelector(selectRoom);

  return (
    <Navbar>
      <NavbarGroup align={Alignment.LEFT}>
        <NavbarHeading>cedar</NavbarHeading>
        <NavbarDivider />
        {recordingState === 'recording' && <RecordingIcon />}
        {room.id &&
          room.name && <RoomNameplate id={room.id} name={room.name} />}
      </NavbarGroup>
    </Navbar>
  );
}