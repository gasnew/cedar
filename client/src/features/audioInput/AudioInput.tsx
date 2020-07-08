import _ from 'lodash';
import React, { useEffect, useState } from 'react';
import { Card, H4, Button, H5, MenuItem } from '@blueprintjs/core';
import { ItemRenderer, Select } from '@blueprintjs/select';

import DeviceVolume from './DeviceVolume';

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
    navigator.mediaDevices.enumerateDevices().then(maybeDevices => {
      setInputDevices(
        _.filter(
          maybeDevices,
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

// TODO(gnewman): Actually install lodash
export default function() {
  const [
    requestPermission,
    { hasPermission, inputDevices },
  ] = useInputDevices();
  const [selectedDevice, setSelectedDevice] = useState<IInputDevice | null>(
    null
  );

  if (!hasPermission && selectedDevice) setSelectedDevice(null);

  return (
    <Card>
      <H4>Audio input</H4>
      <InputDeviceSelect
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
          onClick={requestPermission}
        >
          {selectedDevice ? (
            selectedDevice.label
          ) : (
            <i>please select an input device</i>
          )}
        </Button>
      </InputDeviceSelect>
      <DeviceVolume deviceId={selectedDevice?.deviceId || null} />
    </Card>
  );
}
