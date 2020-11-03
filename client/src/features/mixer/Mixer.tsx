import _ from 'lodash';
import React, { useEffect } from 'react';
import { useSelector } from 'react-redux';

import AudioBarAndControls from './AudioBarAndControls';
import MasterOutput from './MasterOutput';
import { useRoomAudio } from './MasterOutputHooks';
import { selectMusicians } from '../musicians/musiciansSlice';
import { selectPrecedingMusicianIds } from '../room/roomSlice';

export default function() {
  const precedingMusicianIds = useSelector(selectPrecedingMusicianIds);
  const musicians = useSelector(selectMusicians);

  // Audio data
  const { masterControls, trackControls } = useRoomAudio(
    precedingMusicianIds.length
  );

  useEffect(
    () => {
      const musiciansInOrder = _.map(precedingMusicianIds, musicians);
      console.log(musiciansInOrder);
      console.log(trackControls);
    },
    [precedingMusicianIds, musicians, trackControls]
  );

  return (
    <div>
      {_.map(trackControls, (controls, index) => (
        <AudioBarAndControls key={index} controls={controls} name="bobbeh" />
      ))}
      {masterControls && <MasterOutput controls={masterControls} />}
    </div>
  );
}
