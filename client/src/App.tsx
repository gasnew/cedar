import React, { Component, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { Classes } from '@blueprintjs/core';

import { useCreate } from './features/feathers/Feathers';
import { setRoom, selectRoom } from './features/room/roomSlice';
import Navbar from './features/navbar/Navbar';
import RoomOverlay from './features/roomOverlay/RoomOverlay';

function App() {
  // Local state
  const [showSidebar, setShowSidebar] = useState(false);
  const [showRoomModal, setShowRoomModal] = useState(true);
  const [roomId, setRoomId] = useState('');
  const [joinError, setJoinError] = useState('');
  const [roomName, setRoomName] = useState('');
  const [customCreateError, setCustomCreateError] = useState('');

  // Redux state
  const dispatch = useDispatch();
  const room = useSelector(selectRoom);

  // API state
  const [
    createRoomBackend,
    { data: createData, error: backendCreateError, loading: createLoading },
  ] = useCreate('rooms', { name: roomName });

  const joinRoom = () => {
    setJoinError('Cannot join a room at this time');
  };
  const createRoom = async () => {
    if (!roomName) {
      setCustomCreateError('Room name must be filled!');
      return;
    }
    setCustomCreateError('');
    const { data } = await createRoomBackend();
    if (data) {
      dispatch(setRoom(data));
      setShowRoomModal(false);
    }
  };

  const createFieldError = customCreateError || backendCreateError?.message;

  return (
    <div className={Classes.DARK}>
      <Navbar />
      <RoomOverlay />
    </div>
  );
}

export default App;
