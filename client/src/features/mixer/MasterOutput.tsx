import _ from 'lodash';
import React, { useState } from 'react';
import { Card, H4, Slider } from '@blueprintjs/core';

import VolumeBar from '../audioInput/VolumeBar';
import { TrackControls } from './MixerHooks';

interface Props {
  controls: TrackControls;
}

export default function({ controls }: Props) {
  // Slider state (default to 0.01 to get around UI bug)
  const [sliderGainDB, setSliderGainDB] = useState(0.01);

  return (
    <>
      <div style={{ marginBottom: 10 }}>
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
          `${_.round(value, 1) >= 0 ? '+' : ''}${_.round(value, 1)}\u00A0dB`
        }
      />
    </>
  );
}
