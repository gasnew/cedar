import React, { useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { Card, H4, Switch } from '@blueprintjs/core';

import AudioInputSelector from './AudioInputSelector';
import { selectInputDevice, setInputDevice } from './audioSlice';
import { useStream, useStreamData } from './AudioStreamHooks';
import { selectRecordingState } from '../recording/recordingSlice';
import VolumeSlider from '../mixer/VolumeSlider';

export default function() {
  // Device selection
  const dispatch = useDispatch();
  const selectedDevice = useSelector(selectInputDevice);

  // Audio data
  const [listeningToAudioInput, setListeningToAudioInput] = useState(false);
  const {
    canChangeStream,
    fetchData,
    setGainDB,
    setDirectToDestinationGainNodeGain,
  } = useStreamData(useStream(selectedDevice ? selectedDevice.deviceId : null));

  // Redux state
  const recordingState = useSelector(selectRecordingState);

  const selectionDisabled = !canChangeStream || recordingState !== 'stopped';
  const handleToggleListening = () => {
    setDirectToDestinationGainNodeGain(listeningToAudioInput === true ? 0 : 1);
    setListeningToAudioInput(!listeningToAudioInput);
  };

  return (
    <Card style={{ flexGrow: 1 }}>
      <div style={{ display: 'flex', flexDirection: 'row' }}>
        <H4>Audio input</H4>
        <Switch
          style={{ marginLeft: 'auto' }}
          checked={listeningToAudioInput}
          label="Monitor input"
          onChange={handleToggleListening}
        />
      </div>
      <div style={{ marginBottom: 10 }}>
        <AudioInputSelector
          disabled={selectionDisabled}
          setSelectedDevice={device => dispatch(setInputDevice(device))}
          selectedDevice={selectedDevice}
        />
      </div>
      <VolumeSlider controls={{ fetchData, setGainDB }} />
    </Card>
  );
}
