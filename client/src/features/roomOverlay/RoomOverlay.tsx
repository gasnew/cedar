import React, { useState } from 'react';

import {
  Button,
  Card,
  Classes,
  Code,
  Dialog,
  Divider,
  FormGroup,
  InputGroup,
  ControlGroup,
  H3,
  H5,
  Intent,
  Overlay,
  Switch,
} from '@blueprintjs/core';
import { CSSTransition } from 'react-transition-group';

import './RoomOverlay.css';

import { useDispatch, useSelector } from 'react-redux';

import { useCreate, useLazyGet } from '../../features/feathers/Feathers';
import { setRoom, selectRoom } from '../../features/room/roomSlice';
import Navbar from '../../features/navbar/Navbar';
import RoomOverlay from '../../features/roomOverlay/RoomOverlay';

const OVERLAY_EXAMPLE_CLASS = 'docs-overlay-example-transition';
const OVERLAY_TALL_CLASS = 'docs-overlay-example-tall';

export default function() {
  // Redux state
  const dispatch = useDispatch();
  const room = useSelector(selectRoom);

  // Local state
  const [isOpen, setIsOpen] = useState(!!!room.id);
  const [roomId, setRoomId] = useState('');
  const [joinFormError, setJoinFormError] = useState('');
  const [roomName, setRoomName] = useState('');
  const [createFormError, setCreateFormError] = useState('');

  // API state
  const [
    joinRoomBackend,
    { data: getData, error: getApiError, loading: getLoading },
  ] = useLazyGet('rooms', roomId);
  const [
    createRoomBackend,
    { data: createData, error: createApiError, loading: createLoading },
  ] = useCreate('rooms', { name: roomName });

  const joinRoom = async () => {
    if (!roomId) {
      setJoinFormError('Room ID must be filled!');
      return;
    }
    setJoinFormError('');
    const { data } = await joinRoomBackend();
    if (data) {
      dispatch(setRoom(data));
      setIsOpen(false);
    }
  };
  const createRoom = async () => {
    if (!roomName) {
      setCreateFormError('Room name must be filled!');
      return;
    }
    setCreateFormError('');
    const { data } = await createRoomBackend();
    if (data) {
      dispatch(setRoom(data));
      setIsOpen(false);
    }
  };

  const createFieldHelperText = createFormError || createApiError?.message;
  const joinFieldHelperText = joinFormError || getApiError?.message;
  const intentForError = (errorMessage: any) =>
    errorMessage ? 'danger' : 'none';

  return (
    <Dialog
      className={Classes.DARK}
      icon="tree"
      title="Join or create a Cedar room!"
      isOpen={isOpen}
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
              placeholder="abc-123-def-456"
            />
            <Button
              disabled={createLoading}
              icon="arrow-right"
              onClick={joinRoom}
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
              value={roomName}
              intent={intentForError(createFieldHelperText)}
              placeholder="Brodyquest Fanclub"
            />
            <Button
              intent="primary"
              outlined
              icon="arrow-right"
              loading={createLoading}
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
