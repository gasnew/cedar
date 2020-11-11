import _ from 'lodash';
import React, { useEffect, useState } from 'react';
import { Card, Colors, H4, Slider } from '@blueprintjs/core';

import VolumeBar from '../audioInput/VolumeBar';
import { TrackControls } from './MixerHooks';
import { Musician } from '../musicians/musiciansSlice';

interface Props {
  controls: TrackControls;
}

export default function({ controls }: Props) {
  // Slider state (default to 0.01 to get around UI bug)
  const [sliderGainDB, setSliderGainDB] = useState(0.01);

  useEffect(() => {
    controls.setGainDB(sliderGainDB)
  });

  return (
    <div style={{ position: 'relative', marginTop: 2 }}>
      <div style={{ marginLeft: 8, marginRight: 15 }}>
        <div
          style={{
            position: 'absolute',
            top: -3,
            left: 8,
            height: 6,
            width: 'calc(100% - 23px)',
          }}
        >
          <VolumeBar
            fetchData={controls.fetchData}
            disabled={false}
          />
        </div>
        <Slider
          className="invisible-slider-track"
          min={-40}
          max={12}
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
      </div>
    </div>
  );
}
