import React, { useContext, useEffect, useRef, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import {
  Button,
  ButtonGroup,
  Card,
  Divider,
  NumericInput,
  Tag,
} from '@blueprintjs/core';

import { selectLoopbackLatencyMs, setLoopbackLatencyMs } from './mediaBarSlice';

export default function({ disabled }: { disabled: boolean }) {
  const loopbackLatencyMs = useSelector(selectLoopbackLatencyMs);
  const dispatch = useDispatch();

  return (
    <div style={{ display: 'flex', flexDirection: 'row' }}>
      <span style={{ marginTop: 6 }}>Loopback latency:&nbsp;</span>
      <NumericInput
        buttonPosition="none"
        selectAllOnFocus
        min={0}
        max={9999}
        value={loopbackLatencyMs}
        disabled={disabled}
        onValueChange={value => {
          dispatch(setLoopbackLatencyMs({ loopbackLatencyMs: value || 0 }));
        }}
        onBlur={() => {
          const value = loopbackLatencyMs;
          const newValue = value < 0 ? 0 : value > 9999 ? 9999 : value || 0;
          dispatch(setLoopbackLatencyMs({ loopbackLatencyMs: newValue }));
          window.blur();
        }}
        style={{ width: 55 }}
      />
      <span style={{ marginTop: 6 }}>&nbsp;ms</span>
    </div>
  );
}
