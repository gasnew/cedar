import React from 'react';
import { Classes, Colors } from '@blueprintjs/core';

import AudioInput from './features/audioInput/AudioInput';
import Navbar from './features/navbar/Navbar';
import RoomOverlay from './features/roomOverlay/RoomOverlay';

function App() {
  return (
    <div
      style={{
        backgroundColor: Colors.DARK_GRAY3,
        position: 'absolute',
        width: '100%',
        top: 0,
        bottom: 0,
      }}
      className={Classes.DARK}
    >
      <Navbar />
      <AudioInput />
      <RoomOverlay />
    </div>
  );
}

export default App;
