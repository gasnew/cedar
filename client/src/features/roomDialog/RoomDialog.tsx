import React, { useState } from 'react';

import {
  Button,
  Classes,
  Dialog,
  Divider,
  FormGroup,
  InputGroup,
  ControlGroup,
} from '@blueprintjs/core';

import { useDispatch, useSelector } from 'react-redux';

import { randomBirdName } from '../../app/util';
import { useCreate, useLazyGet } from '../../features/feathers/FeathersHooks';
import { setRoom, selectRoom } from '../../features/room/roomSlice';

export default function () {
  // Redux state
  const dispatch = useDispatch();
  const room = useSelector(selectRoom);

  // Local state
  const [roomId, setRoomId] = useState('');
  const [joinFormError, setJoinFormError] = useState('');
  const [roomName, setRoomName] = useState('');
  const [createFormError, setCreateFormError] = useState('');

  // API state
  const [joinRoomBackend, { error: getApiError, loading: getLoading }] =
    useLazyGet('rooms', roomId);
  const [createRoomBackend, { error: createApiError, loading: createLoading }] =
    useCreate('rooms', { name: roomName });
  const [
    createMusicianBackend,
    { error: musicianApiError, loading: musicianLoading },
  ] = useCreate('musicians', { name: randomBirdName() });

  // Button actions
  const joinRoom = async () => {
    if (!roomId) {
      setJoinFormError('Room ID must be filled!');
      return;
    }
    setJoinFormError('');
    const { data: roomData } = await joinRoomBackend();
    if (!roomData) return;
    const { data: musicianData } = await createMusicianBackend(
      { name: randomBirdName() },
      { roomId: roomData.id }
    );
    if (musicianData) {
      dispatch(
        setRoom({
          ...roomData,
          musicianId: musicianData.id,
        })
      );
    }
  };
  const createRoom = async () => {
    if (!roomName) {
      setCreateFormError('Room name must be filled!');
      return;
    }
    setCreateFormError('');
    const { data: roomData } = await createRoomBackend();
    if (!roomData) return;
    const { data: musicianData } = await createMusicianBackend(
      { name: randomBirdName() },
      { roomId: roomData.id }
    );
    if (musicianData) {
      dispatch(
        setRoom({
          ...roomData,
          musicianId: musicianData.id,
        })
      );
    }
  };

  // Helpful constants
  const createFieldHelperText =
    createFormError ||
    (createApiError && createApiError.message) ||
    (musicianApiError && musicianApiError.message);
  const joinFieldHelperText =
    joinFormError ||
    (getApiError && getApiError.message) ||
    (musicianApiError && musicianApiError.message);
  const intentForError = (errorMessage: any) =>
    errorMessage ? 'danger' : 'none';

  return (
    <Dialog
      className={Classes.DARK}
      icon="tree"
      title="Join or create a Cedar room!"
      isOpen={!!!room.id}
      isCloseButtonShown={false}
    >
      <div className={Classes.DIALOG_BODY}>
        <p>
          A Cedar Room is where musicians go to perform together over the
          internet! Have fun, and play safe.
        </p>
        <FormGroup
          helperText={joinFieldHelperText}
          intent={intentForError(joinFieldHelperText)}
          label={'Join a room'}
          labelFor="text-input"
        >
          <ControlGroup id="join-room">
            <InputGroup
              fill
              intent={intentForError(joinFieldHelperText)}
              onChange={(event: any) => setRoomId(event.target.value)}
              onKeyPress={(event) => event.key === 'Enter' && joinRoom()}
              placeholder="abc-123-def-456"
            />
            <Button
              disabled={createLoading || musicianLoading}
              icon="arrow-right"
              onClick={joinRoom}
              loading={getLoading}
              intent="primary"
            >
              Join
            </Button>
          </ControlGroup>
        </FormGroup>
        <Divider />
        <FormGroup
          helperText={createFieldHelperText}
          intent={intentForError(createFieldHelperText)}
          label={'Create a room'}
          labelFor="text-input"
        >
          <ControlGroup id="create-room">
            <InputGroup
              fill
              onChange={(event: any) => setRoomName(event.target.value)}
              onKeyPress={(event) => event.key === 'Enter' && createRoom()}
              value={roomName}
              intent={intentForError(createFieldHelperText)}
              placeholder="Brodyquest Fanclub"
            />
            <Button
              disabled={getLoading}
              intent="primary"
              outlined
              icon="arrow-right"
              loading={createLoading || musicianLoading}
              onClick={createRoom}
            >
              Create
            </Button>
          </ControlGroup>
        </FormGroup>
      </div>
    </Dialog>
  );
}
