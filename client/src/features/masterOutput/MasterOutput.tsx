import _ from 'lodash';
import React, { useEffect, useState } from 'react';
import { Card, H4, Button, MenuItem, Slider } from '@blueprintjs/core';
import { ItemRenderer, Select } from '@blueprintjs/select';

import { useRoomAudio } from './MasterOutputHooks';
import VolumeBar from '../audioInput/VolumeBar';

export default function() {
  // Audio data
  const { someData, fetchData, setGainDB } = useRoomAudio();

  // Slider state (default to 0.01 to get around UI bug)
  const [sliderGainDB, setSliderGainDB] = useState(0.01);

  return (
    <Card style={{ width: 300 }}>
      <H4>Master output</H4>
      <div style={{ marginBottom: 10 }}>
        <VolumeBar
          height={20}
          width={250}
          fetchData={fetchData}
          disabled={!someData}
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
          setGainDB(newValue);
        }}
        value={sliderGainDB}
        labelRenderer={value =>
          `${_.round(value, 1) >= 0 ? '+' : ''}${_.round(value, 1)} dB`
        }
      />
    </Card>
  );
}
