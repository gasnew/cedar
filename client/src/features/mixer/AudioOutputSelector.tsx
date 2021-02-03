// NOTE(gnewman): This file repeats a lot of code from AudioInputSelector.tsx.

import _ from 'lodash';
import React, { useEffect, useState } from 'react';
import { Button, MenuItem } from '@blueprintjs/core';
import { ItemRenderer, Select } from '@blueprintjs/select';

import { IOutputDevice } from '../audioInput/audioSlice';

const outputDeviceRenderer: ItemRenderer<IOutputDevice> = (
  outputDevice,
  { handleClick, modifiers, query }
) => (
  <MenuItem
    key={outputDevice.deviceId}
    active={modifiers.active}
    onClick={handleClick}
    text={outputDevice.label}
  />
);

const OutputDeviceSelect = Select.ofType<IOutputDevice>();

function useOutputDevices(): IOutputDevice[] {
  // TODO(gnewman): Handle devices being plugged in and unplugged
  const [outputDevices, setOutputDevices] = useState<IOutputDevice[]>([]);

  useEffect(() => {
    navigator.mediaDevices.enumerateDevices().then(devices => {
      setOutputDevices(
        _.map(
          _.filter(
            devices,
            device =>
              device.kind === 'audiooutput' &&
              !!device.deviceId &&
              device.deviceId !== 'default'
          ),
          ({ deviceId, groupId, kind, label }) => ({
            deviceId,
            groupId,
            kind,
            label,
          })
        )
      );
    });
  }, []);

  return outputDevices;
}

interface Props {
  disabled?: boolean;
  selectedDevice: IOutputDevice | null;
  setSelectedDevice: (IOutputDevice) => void;
}

export default function({
  disabled = false,
  selectedDevice,
  setSelectedDevice,
}: Props) {
  // Device selection
  const outputDevices = useOutputDevices();

  useEffect(
    () => {
      if (!selectedDevice && outputDevices.length > 0)
        setSelectedDevice(
          _.find(outputDevices, ({ kind }) => kind === 'default') ||
            outputDevices[0]
        );
    },
    [setSelectedDevice, selectedDevice, outputDevices]
  );

  return (
    <OutputDeviceSelect
      disabled={disabled}
      filterable={false}
      items={outputDevices}
      itemRenderer={outputDeviceRenderer}
      noResults={
        <MenuItem disabled={true} text={'Searching for output devices...'} />
      }
      onItemSelect={setSelectedDevice}
      popoverProps={{ minimal: true }}
    >
      <Button icon="headset" rightIcon="caret-down" disabled={disabled}>
        {selectedDevice ? (
          selectedDevice.label
        ) : (
          <i>please select an output device</i>
        )}
      </Button>
    </OutputDeviceSelect>
  );
}
