import {
  Card,
  Classes,
  Colors,
  H4,
  H5,
  Slider,
  Tooltip,
} from '@blueprintjs/core';
import _ from 'lodash';
import React, { useEffect, useState } from 'react';
import { useSelector } from 'react-redux';

import styles from './Mixer.module.css';
import MusicianTrackControls from './MusicianTrackControls';
import './MusicianTrackControls.css';
import MasterOutput from './MasterOutput';
import { TrackControls, useRoomAudio } from './MixerHooks';
import { Musician, selectMusicians } from '../musicians/musiciansSlice';
import { selectPrecedingMusicianIds } from '../room/roomSlice';
import VolumeSlider from './VolumeSlider';

const MIXER_TOOLTIP = (
  <p style={{ margin: 0, maxWidth: 250 }}>
    Don't worry, this mixer is just for you! Changing people's volume will not
    affect what anybody else hears.
  </p>
);

interface TrackWithMusician {
  trackControls: TrackControls;
  musician: Musician;
}

export default function() {
  const [tracksWithMusicians, setTracksWithMusicians] = useState<
    TrackWithMusician[]
  >([]);

  const precedingMusicianIds = useSelector(selectPrecedingMusicianIds);
  const musicians = useSelector(selectMusicians);

  // Audio data
  const { masterControls, trackControls } = useRoomAudio(
    precedingMusicianIds.length
  );

  useEffect(
    () => {
      // We cannot have more tracks than we have accounted-for musicians before
      // us and track controls coming in
      const trackCount =
        _.min(
          [
            _.filter(precedingMusicianIds, id => !!musicians[id]).length,
            trackControls.length,
          ]
        ) || 0;

      setTracksWithMusicians(
        _.map(_.range(trackCount), index => {
          return {
            trackControls: trackControls[index],
            musician: musicians[precedingMusicianIds[index]],
          };
        })
      );
    },
    [precedingMusicianIds, musicians, trackControls]
  );

  return (
    <Card
      style={{
        flexGrow: 1,
        display: 'flex',
        flexDirection: 'column',
        minWidth: 300,
        height: '100%',
      }}
    >
      <H4>
        <Tooltip className={Classes.TOOLTIP_INDICATOR} content={MIXER_TOOLTIP}>
          Personal Mixer
        </Tooltip>
      </H4>
      <Card
        elevation={2}
        className={styles.listCard}
        style={{
          backgroundColor: Colors.DARK_GRAY5,
        }}
      >
        <div className={styles.listContainer}>
          <div style={{ zIndex: -1, pointerEvents: 'initial' }}>
            {_.map(
              tracksWithMusicians,
              ({ trackControls, musician }, index) => (
                <MusicianTrackControls
                  key={musician.id}
                  controls={trackControls}
                  musician={musician}
                  index={index}
                />
              )
            )}
          </div>
        </div>
      </Card>
      <div
        style={{
          backgroundColor: Colors.DARK_GRAY4,
        }}
      >
        <H5
          style={{
            padding: 10,
            margin: 0,
          }}
        >
          Master output
        </H5>
        <div style={{ marginLeft: 12, marginRight: 4 }}>
          {masterControls && <VolumeSlider controls={masterControls} />}
        </div>
      </div>
    </Card>
  );
}
