import _ from 'lodash';
import React, { useEffect, useState } from 'react';
import { Card, H4, Button, MenuItem, Slider } from '@blueprintjs/core';
import { ItemRenderer, Select } from '@blueprintjs/select';

import { useStream, useStreamData } from './AudioStreamHooks';
import VolumeBar from './VolumeBar';

interface IInputDevice {
  deviceId: string;
  groupId: string;
  label: string;
}
const inputDeviceRenderer: ItemRenderer<IInputDevice> = (
  inputDevice,
  { handleClick, modifiers, query }
) => (
  <MenuItem
    key={inputDevice.deviceId}
    active={modifiers.active}
    onClick={handleClick}
    text={inputDevice.label}
  />
);

const InputDeviceSelect = Select.ofType<IInputDevice>();

interface InputDeviceData {
  hasPermission: boolean;
  inputDevices: IInputDevice[];
}
function useInputDevices(): [() => void, InputDeviceData] {
  // TODO(gnewman): Handle devices being plugged in and unplugged
  const [inputDevices, setInputDevices] = useState<IInputDevice[]>([]);
  const [hasPermission, setHasPermission] = useState<boolean>(false);

  const requestPermission = () =>
    navigator.mediaDevices
      .getUserMedia({ audio: true })
      .then(() => setHasPermission(true))
      .catch(error => {
        console.log('no');
        console.error(`Input device permission denied: ${error}`);
        setHasPermission(false);
      });

  useEffect(() => {
    requestPermission();
  }, []);
  useEffect(() => {
    navigator.mediaDevices.enumerateDevices().then(devices => {
      setInputDevices(
        _.filter(
          devices,
          device =>
            device.kind === 'audioinput' &&
            !!device.deviceId &&
            device.deviceId !== 'default'
        )
      );
    });
  }, [hasPermission]);

  return [requestPermission, { hasPermission, inputDevices }];
}

export default function() {
  console.log('INPUTTT');
  // Device selection
  const [
    requestPermission,
    { hasPermission, inputDevices },
  ] = useInputDevices();
  const [selectedDevice, setSelectedDevice] = useState<IInputDevice | null>(
    null
  );

  // Audio data
  const { canChangeStream, someData, fetchData, setGainDB } = useStreamData(
    useStream(selectedDevice?.deviceId || null)
  );

  // Slider state (default to 0.01 to get around UI bug)
  const [sliderGainDB, setSliderGainDB] = useState(0.01);

  if (!hasPermission && selectedDevice) setSelectedDevice(null);
  if (hasPermission && !selectedDevice && inputDevices.length > 0)
    setSelectedDevice(inputDevices[0]);

  return (
    <Card style={{ width: 300 }}>
      <H4>Audio input</H4>
      <div style={{ marginBottom: 10 }}>
        <InputDeviceSelect
          disabled={!canChangeStream}
          filterable={false}
          items={inputDevices}
          itemRenderer={inputDeviceRenderer}
          noResults={
            <MenuItem
              disabled={true}
              text={
                hasPermission
                  ? 'Searching for input devices...'
                  : `Microphone access has been denied. Please allow access to
                   use this feature.`
              }
            />
          }
          onItemSelect={setSelectedDevice}
          popoverProps={{ minimal: true }}
        >
          <Button
            icon="headset"
            rightIcon="caret-down"
            disabled={!canChangeStream}
            onClick={requestPermission}
          >
            {selectedDevice ? (
              selectedDevice.label
            ) : (
              <i>please select an input device</i>
            )}
          </Button>
        </InputDeviceSelect>
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
