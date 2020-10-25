import _ from 'lodash';
import React, { useEffect, useState } from 'react';
import { useSelector } from 'react-redux';
import { Card, H4, Button, MenuItem, Slider } from '@blueprintjs/core';
import { ItemRenderer, Select } from '@blueprintjs/select';

import { useStream, useStreamData } from './AudioStreamHooks';
import { selectRecordingState } from '../recording/recordingSlice';
import VolumeBar from './VolumeBar';

export interface IInputDevice {
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
        console.error(`Input device permission denied: ${error}`);
        setHasPermission(false);
      });

  useEffect(() => {
    requestPermission();
  }, []);
  useEffect(
    () => {
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
    },
    [hasPermission]
  );

  return [requestPermission, { hasPermission, inputDevices }];
}

interface Props {
  disabled?: boolean;
  selectedDevice: IInputDevice | null;
  setSelectedDevice: (IInputDevice) => void;
}

export default function({
  disabled = false,
  selectedDevice,
  setSelectedDevice,
}: Props) {
  // Device selection
  const [
    requestPermission,
    { hasPermission, inputDevices },
  ] = useInputDevices();

  useEffect(() => {
    if (!hasPermission && selectedDevice) setSelectedDevice(null);
    if (hasPermission && !selectedDevice && inputDevices.length > 0)
      setSelectedDevice(inputDevices[0]);
  });

  return (
    <InputDeviceSelect
      disabled={disabled}
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
        disabled={disabled}
        onClick={requestPermission}
      >
        {selectedDevice ? (
          selectedDevice.label
        ) : (
          <i>please select an input device</i>
        )}
      </Button>
    </InputDeviceSelect>
  );
}
