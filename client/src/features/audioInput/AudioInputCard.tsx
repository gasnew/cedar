import React, { useEffect, useMemo, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { Card, H4, Switch } from '@blueprintjs/core';

import AudioInputSelector from './AudioInputSelector';
import {
  selectInputDevice,
  selectOutputDevice,
  setInputDevice,
} from './audioSlice';
import { useStream, useStreamData } from './AudioStreamHooks';
import { selectRecordingState } from '../recording/recordingSlice';
import VolumeSlider from '../mixer/VolumeSlider';

export default function() {
  // Device selection
  const dispatch = useDispatch();
  const selectedInputDevice = useSelector(selectInputDevice);

  // Audio output (for monitoring only)
  const selectedOutputDevice = useSelector(selectOutputDevice);
  const audioElement = useMemo<HTMLAudioElement>(() => new Audio(), []);
  useEffect(
    () => {
      if (selectedOutputDevice)
        audioElement.setSinkId(selectedOutputDevice.deviceId);
    },
    [audioElement, selectedOutputDevice]
  );

  // Audio data
  const [listeningToAudioInput, setListeningToAudioInput] = useState(false);
  const {
    canChangeStream,
    fetchData,
    setGainDB,
    setDirectToDestinationGainNodeGain,
  } = useStreamData(
    useStream(selectedInputDevice ? selectedInputDevice.deviceId : null),
    audioElement
  );

  // Redux state
  const recordingState = useSelector(selectRecordingState);

  const interactionDisabled = !canChangeStream || recordingState !== 'stopped';
  const handleToggleListening = () => {
    setListeningToAudioInput(!listeningToAudioInput);
  };
  useEffect(
    () => {
      // Disable monitoring if we are recording
      if (interactionDisabled && listeningToAudioInput)
        setListeningToAudioInput(false);
    },
    [interactionDisabled]
  );
  useEffect(
    () => {
      setDirectToDestinationGainNodeGain(
        listeningToAudioInput === true ? 1 : 0
      );
    },
    [listeningToAudioInput]
  );

  return (
    <Card style={{ flexGrow: 1 }}>
      <div style={{ display: 'flex', flexDirection: 'row' }}>
        <H4>Audio input</H4>
        <Switch
          style={{ marginLeft: 'auto' }}
          checked={listeningToAudioInput}
          label="Monitor input"
          disabled={interactionDisabled}
          onChange={handleToggleListening}
        />
      </div>
      <div style={{ marginBottom: 10 }}>
        <AudioInputSelector
          disabled={interactionDisabled}
          setSelectedDevice={device => dispatch(setInputDevice(device))}
          selectedDevice={selectedInputDevice}
        />
      </div>
      <VolumeSlider controls={{ fetchData, setGainDB }} />
    </Card>
  );
}
