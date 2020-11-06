import _ from 'lodash';
import React, { useState } from 'react';
import { Card, Colors, H4, Slider } from '@blueprintjs/core';

import VolumeBar from '../audioInput/VolumeBar';
import { TrackControls } from './MixerHooks';
import { Musician } from '../musicians/musiciansSlice';
import VolumeSlider from './VolumeSlider';

interface Props {
  musician: Musician;
  controls: TrackControls;
  index: number;
}

export default function({ musician, controls, index }: Props) {
  return (
    <Card
      style={{
        backgroundColor: index % 2 ? Colors.DARK_GRAY5 : Colors.DARK_GRAY4,
        padding: 5,
        display: 'flex',
        flexDirection: 'row',
        borderRadius: 0,
      }}
    >
      <span
        style={{
          color: index % 2 ? Colors.GRAY2 : Colors.GRAY1,
          //position: 'relative',
          marginTop: 4,
          marginRight: 8,
          fontSize: 18,
          fontWeight: 'bold',
        }}
      >
        {index + 1}
      </span>
      <div style={{ flexGrow: 1 }}>
        <div style={{ fontWeight: 'bold', marginTop: 4 }}>{musician.name}</div>
        <VolumeSlider
          controls={{
            ...controls,
            fetchData: () =>
              new Uint8Array([Math.floor(128 * Math.random()) + 128]),
          }}
        />
      </div>
    </Card>
  );
}
