import _ from 'lodash';
import React, { useState } from 'react';
import { Card, H4, Slider } from '@blueprintjs/core';

import VolumeBar from '../audioInput/VolumeBar';
import { TrackControls } from './MasterOutputHooks';

interface Props {
  name: string;
  controls: TrackControls;
}

export default function({ name, controls }: Props) {
  // Slider state (default to 0.01 to get around UI bug)
  const [sliderGainDB, setSliderGainDB] = useState(0.01);

  return (
    <Card style={{ width: 300 }}>
      <span style={{ fontWeight: 'bold' }}>{name}</span>
      <div style={{ marginBottom: 10 }}>
        <VolumeBar
          height={20}
          width={250}
          fetchData={controls.fetchData}
          disabled={false}
        />
      </div>
      <Slider
        min={-40}
        max={6}
        stepSize={0.2}
        labelStepSize={66}
        onChange={value => {
          const newValue = Math.abs(value) < 0.5 ? 0.01 : value;
          setSliderGainDB(newValue);
          controls.setGainDB(newValue);
        }}
        value={sliderGainDB}
        labelRenderer={value =>
          `${_.round(value, 1) >= 0 ? '+' : ''}${_.round(value, 1)} dB`
        }
      />
    </Card>
  );
}
