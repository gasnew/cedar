import React, { useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { Classes, NumericInput, Tooltip } from '@blueprintjs/core';

import { usePatch } from '../feathers/FeathersHooks';
import LoopbackCalibrationButton from './LoopbackCalibrationButton';
import { selectLoopbackLatencyMs, setLoopbackLatencyMs } from './mediaBarSlice';
import { setMusicianLoopbackLatencyMs } from '../musicians/musiciansSlice';
import { selectRoom } from '../room/roomSlice';

const LOOPBACK_LATENCY_TOOLTIP = (
  <p style={{ margin: 0, maxWidth: 250 }}>
    Loopback latency is the amount of time it takes for audio to travel out of
    your computer through the speakers then back in through the microphone.
    Click the <strong>Calibrate</strong> button for more information on how to
    determine this value.
  </p>
);

export default function({ disabled }: { disabled: boolean }) {
  const [isEditing, setIsEditing] = useState(false);
  const loopbackLatencyMs = useSelector(selectLoopbackLatencyMs);
  const { musicianId } = useSelector(selectRoom);
  const dispatch = useDispatch();

  const [patchMusician] = usePatch('musicians');

  const setLocalLoopbackLatencyMs = (loopbackLatencyMs: number) => {
    if (!musicianId) return;
    dispatch(setLoopbackLatencyMs({ loopbackLatencyMs }));
    dispatch(
      setMusicianLoopbackLatencyMs({
        musicianId,
        loopbackLatencyMs,
      })
    );
  };
  return (
    <div style={{ display: 'flex', flexDirection: 'row' }}>
      <span style={{ marginTop: 6 }}>
        <Tooltip
          className={Classes.TOOLTIP_INDICATOR}
          content={LOOPBACK_LATENCY_TOOLTIP}
        >
          Loopback latency
        </Tooltip>
        :&nbsp;
      </span>
      <NumericInput
        buttonPosition="none"
        selectAllOnFocus
        min={0}
        max={9999}
        value={
          isEditing
            ? loopbackLatencyMs || ''
            : loopbackLatencyMs === null
              ? ''
              : loopbackLatencyMs
        }
        disabled={disabled}
        onValueChange={setLocalLoopbackLatencyMs}
        onFocus={() => {
          setIsEditing(true);
        }}
        onBlur={() => {
          const value = loopbackLatencyMs || 0;
          const newValue = value < 0 ? 0 : value > 9999 ? 9999 : value || 0;
          setLocalLoopbackLatencyMs(newValue);
          if (musicianId)
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
