import React, { Component, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import {
  Box,
  Button,
  Collapsible,
  FormField,
  Grommet,
  Heading,
  Layer,
  Text,
  TextInput,
} from 'grommet';
import { Notification } from 'grommet-icons';

import { useCreate } from './features/feathers/Feathers';
import { setRoom, selectRoom } from './features/room/roomSlice';

const theme = {
  global: {
    colors: {
      brand: '#7c9b4a',
    },
    font: {
      family: 'Roboto',
      size: '14px',
      height: '20px',
    },
  },
};

const AppBar = ({ children }: { children: React.ReactNode }) => (
  <Box
    tag="header"
    direction="row"
    align="center"
    justify="between"
    background="accent-1"
    pad={{ left: 'medium', right: 'small', vertical: 'small' }}
    elevation="medium"
    style={{ zIndex: 1 }}
  >
    {children}
  </Box>
);

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
    <Grommet theme={theme} full>
      <Box fill background="dark-1">
        <AppBar>
          <Heading level="3" margin="none">
            cedar ｜{room?.id || ''}
          </Heading>
          <Button
            icon={<Notification />}
            onClick={() => setShowSidebar(!showSidebar)}
          />
        </AppBar>
        <Box direction="row" flex overflow={{ horizontal: 'hidden' }}>
          <Box flex align="center" justify="center">
            app body
          </Box>
          <Collapsible direction="horizontal" open={showSidebar}>
            <Box
              flex
              width="medium"
              background="light-2"
              elevation="small"
              align="center"
              justify="center"
            >
              sidebar
            </Box>
          </Collapsible>
        </Box>
      </Box>
      {showRoomModal && (<Layer>
        <Box width="medium" flex direction="column" background="dark-2">
          <Box tag="header" background="accent-1" pad="small">
            <Heading level="4" margin="none">
              Join or Create a Music Room!
            </Heading>
          </Box>
          <Box pad="small">
            <Box margin={{ vertical: 'small' }}>
              <Heading level="5" margin={{ top: 'none', bottom: 'small' }}>
                Join Room
              </Heading>
              <Box flex direction="column">
                <Box flex direction="row" gap="small">
                  <TextInput
                    value={roomId}
                    onChange={event => setRoomId(event.target.value)}
                    placeholder="Room ID (e.g., abc-123-abc-123)"
                  />
                  <Button primary label="Join" onClick={joinRoom} />
                </Box>
                {joinError && (
                  <Text size="medium" color="status-critical">
                    {joinError}
                  </Text>
                )}
              </Box>
            </Box>
            <Box margin={{ vertical: 'small' }}>
              <Heading level="5" margin={{ top: 'none', bottom: 'small' }}>
                Create Room
              </Heading>
              <Box flex direction="column">
                <Box flex direction="row" gap="small">
                  <TextInput
                    value={roomName}
                    onChange={event => setRoomName(event.target.value)}
                    placeholder="Room name (e.g., Brodyquest Fanclub)"
                  />
                  <Button primary label="Create" onClick={createRoom} />
                </Box>
              </Box>
              {createFieldError && (
                <Text size="medium" color="status-critical">
                  {createFieldError}
                </Text>
              )}
            </Box>
          </Box>
        </Box>
      </Layer>)}
    </Grommet>
  );
}

export default App;
