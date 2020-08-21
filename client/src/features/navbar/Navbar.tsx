import React from 'react';
import { useSelector } from 'react-redux';
import {
  Alignment,
  Button,
  Classes,
  H4,
  Navbar,
  NavbarDivider,
  NavbarGroup,
  NavbarHeading,
  Popover,
} from '@blueprintjs/core';

import { selectRoom } from '../../features/room/roomSlice';

export default function() {
  const room = useSelector(selectRoom);

  return (
    <Navbar>
      <NavbarGroup align={Alignment.LEFT}>
        <NavbarHeading>cedar</NavbarHeading>
        <NavbarDivider />
        <Popover
          popoverClassName={Classes.POPOVER_CONTENT_SIZING}
          modifiers={{
            arrow: { enabled: true },
            flip: { enabled: true },
            keepTogether: { enabled: true },
            preventOverflow: { enabled: true },
          }}
        >
          <Button minimal text={room.name || 'Room not joined...'} />
          <div>
            <H4>Room Info</H4>
            <p>
              <span style={{ fontWeight: 'bold' }}>Name: </span> {room.name}
            </p>
            <p>
              <span style={{ fontWeight: 'bold' }}>ID: </span> {room.id}
            </p>
          </div>
        </Popover>
      </NavbarGroup>
    </Navbar>
  );
}
