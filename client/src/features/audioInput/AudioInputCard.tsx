import _ from 'lodash';
import React, { useEffect, useState } from 'react';
import { useSelector } from 'react-redux';
import { Card, H4, Button, MenuItem, Slider } from '@blueprintjs/core';
import { ItemRenderer, Select } from '@blueprintjs/select';

import AudioInputSelector, { IInputDevice } from './AudioInputSelector';
import { useStream, useStreamData } from './AudioStreamHooks';
import { selectRecordingState } from '../recording/recordingSlice';
import VolumeBar from './VolumeBar';

export default function() {
  // Device selection
  const [selectedDevice, setSelectedDevice] = useState<IInputDevice | null>(
    null
  );

  // Audio data
  const { canChangeStream, someData, fetchData, setGainDB } = useStreamData(
    useStream(selectedDevice ? selectedDevice.deviceId : null)
  );

  // Slider state (default to 0.01 to get around UI bug)
  const [sliderGainDB, setSliderGainDB] = useState(0.01);

  // Redux state
  const recordingState = useSelector(selectRecordingState);

  const selectionDisabled = !canChangeStream || recordingState !== 'stopped';

  return (
    <Card style={{ width: 300 }}>
      <H4>Audio input</H4>
      <div style={{ marginBottom: 10 }}>
        <AudioInputSelector
          disabled={selectionDisabled}
          setSelectedDevice={setSelectedDevice}
          selectedDevice={selectedDevice}
        />
      </div>
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
