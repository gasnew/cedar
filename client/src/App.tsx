import React from 'react';
import { Classes, Colors } from '@blueprintjs/core';

import AudienceAndMusicians from './features/audienceAndMusicians/AudienceAndMusicians';
import AudioInputCard from './features/audioInput/AudioInputCard';
import MediaBar from './features/mediaBar/MediaBar';
import Mixer from './features/mixer/Mixer';
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
        <div style={{ marginRight: 8 }}>
          <AudioInputCard />
          <div style={{ marginTop: 8 }}>
            <AudienceAndMusicians />
          </div>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', height: 588 }}>
          <Mixer />
        </div>
      </div>
      <RoomDialog />
    </div>
  );
}

export default App;
