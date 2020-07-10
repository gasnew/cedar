import React, { useEffect, useRef, useState } from 'react';
import _ from 'lodash';
import { Stage, Layer, Rect, Text } from 'react-konva';
import { render } from 'react-dom';
import Konva from 'konva';
import { Colors } from '@blueprintjs/core';

export function useInterval(callback: () => void, delay: number) {
  const savedCallback = useRef<() => void>();

  // Remember the latest callback.
  useEffect(() => {
    savedCallback.current = callback;
  }, [callback]);

  // Set up the interval.
  useEffect(() => {
    function tick() {
      if (savedCallback.current) savedCallback.current();
    }
    if (delay !== null) {
      let id = setInterval(tick, delay);
      return () => clearInterval(id);
    }
  }, [delay]);
}

interface Props {
  height: number;
  width: number;
  fetchData: () => Uint8Array;
  disabled: boolean;
}

export default function({ height, width, fetchData, disabled }: Props) {
  const [barHeight, setBarHeight] = useState(0);
  const [dampedBarHeight, setDampedBarHeight] = useState(0);
  const [clipOpacity, setClipOpacity] = useState(0);

  useInterval(() => {
    const offset = 128.0; // The offset of the signal from 0 amplitude
    const amplitudeNormalized =
      ((_.max(fetchData()) || offset) - offset) / 127.0;
    const newBarHeight = amplitudeNormalized * height;

    setBarHeight(newBarHeight);
    setDampedBarHeight(
      _.max([newBarHeight, dampedBarHeight - 0.6]) || newBarHeight
    );
    setClipOpacity(
      amplitudeNormalized == 1.0 ? 1 : _.max([clipOpacity - 0.02, 0]) || 0
    );
  }, 1000 / 60);

  return (
    <Stage width={width} height={height}>
      <Layer>
        <Rect
          x={0}
          y={0}
          width={width}
          height={height}
          fill={Colors.DARK_GRAY3}
        />
        <Rect
          x={0}
          y={height - barHeight}
          width={width}
          height={barHeight}
          fill={disabled ? Colors.GRAY2 : Colors.GREEN3}
        />
        <Rect
          x={0}
          y={height - barHeight}
          width={width}
          height={10}
          fill={Colors.GREEN5}
        />
        <Rect
          x={0}
          y={height - dampedBarHeight}
          width={width}
          height={2}
          fill={Colors.GRAY4}
        />
        <Rect
          x={0}
          y={0}
          width={width}
          height={5}
          fill={Colors.RED3}
          opacity={clipOpacity}
        />
      </Layer>
    </Stage>
  );
}
