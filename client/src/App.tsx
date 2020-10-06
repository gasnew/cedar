import React from 'react';
import { Classes, Colors } from '@blueprintjs/core';

import AudienceAndMusicians from './features/audienceAndMusicians/AudienceAndMusicians';
import AudioInput from './features/audioInput/AudioInput';
import MediaBar from './features/mediaBar/MediaBar';
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
      <div style={{ position: 'relative' }}>
        <MediaBar />
      </div>
      <div style={{ display: 'flex', flexDirection: 'row', margin: 8 }}>
        <div style={{ display: 'flex', flexDirection: 'column', marginRight: 8 }}>
          <AudioInput />
          <MasterOutput />
        </div>
        <AudienceAndMusicians />
      </div>
      <RoomDialog />
    </div>
  );
}

export default App;
