import React from 'react';
import { Classes } from '@blueprintjs/core';

import Navbar from './features/navbar/Navbar';
import RoomOverlay from './features/roomOverlay/RoomOverlay';

function App() {
  return (
    <div
      style={{
        backgroundColor: '#30404d', // Not sure how to not hard-code this?
        position: 'absolute',
        width: '100%',
        top: 0,
        bottom: 0,
      }}
      className={Classes.DARK}
    >
      <Navbar />
      <RoomOverlay />
    </div>
  );
}

export default App;
