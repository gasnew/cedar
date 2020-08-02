import React from 'react';
import { Classes, Colors } from '@blueprintjs/core';

import AudioInput from './features/audioInput/AudioInput';
import MasterOutput from './features/masterOutput/MasterOutput';
import Navbar from './features/navbar/Navbar';
import RoomDialog from './features/roomDialog/RoomDialog';

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
      <MasterOutput />
      <RoomDialog />
    </div>
  );
}

export default App;
