import React, { useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { Button, NumericInput } from '@blueprintjs/core';

import { usePatch } from '../feathers/FeathersHooks';
import LoopbackCalibrationButton from './LoopbackCalibrationButton';
import { selectLoopbackLatencyMs, setLoopbackLatencyMs } from './mediaBarSlice';
import { selectRoom } from '../room/roomSlice';

export default function({ disabled }: { disabled: boolean }) {
  const [isEditing, setIsEditing] = useState(false);
  const loopbackLatencyMs = useSelector(selectLoopbackLatencyMs);
  const { musicianId } = useSelector(selectRoom);
  const dispatch = useDispatch();

  const [patchMusician] = usePatch('musicians');

  return (
    <div style={{ display: 'flex', flexDirection: 'row' }}>
      <span style={{ marginTop: 6 }}>Loopback latency:&nbsp;</span>
      <NumericInput
        buttonPosition="none"
        selectAllOnFocus
        min={0}
        max={9999}
        value={isEditing ? loopbackLatencyMs || '' : loopbackLatencyMs ?? ''}
        disabled={disabled}
        onValueChange={value => {
          dispatch(setLoopbackLatencyMs({ loopbackLatencyMs: value }));
        }}
        onFocus={() => {
          setIsEditing(true);
        }}
        onBlur={() => {
          const value = loopbackLatencyMs || 0;
          const newValue = value < 0 ? 0 : value > 9999 ? 9999 : value || 0;
          dispatch(setLoopbackLatencyMs({ loopbackLatencyMs: newValue }));
          patchMusician(musicianId, { loopbackLatencyMs: newValue });
          setIsEditing(false);
          window.blur();
        }}
        style={{ width: 55 }}
      />
      <span style={{ marginTop: 6 }}>&nbsp;ms</span>&nbsp;
      <LoopbackCalibrationButton />
    </div>
  );
}
