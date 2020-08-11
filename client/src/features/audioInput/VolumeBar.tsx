import _ from 'lodash';
import React, { useEffect, useRef, useState } from 'react';
import { Stage, Layer, Rect } from 'react-konva';
import { Colors } from '@blueprintjs/core';

import { useInterval } from '../../app/util';


interface Props {
  fetchData: () => Uint8Array;
  disabled: boolean;
  height: number;
  width: number;
}

export default function({ height, width, fetchData, disabled }: Props) {
  const [barWidth, setBarWidth] = useState(0);
  const [dampedBarWidth, setDampedBarWidth] = useState(0);
  const [clipOpacity, setClipOpacity] = useState(0);

  useInterval(() => {
    const offset = 128.0; // The offset of the signal from 0 amplitude
    const amplitudeNormalized =
      ((_.max(fetchData()) || offset) - offset) / 127.0;
    const amplitudeDB = 20 * Math.log10(amplitudeNormalized);
    const normalizedDB = (40 + (_.max([amplitudeDB, -40]) ?? -40)) / 40;
    const newBarWidth = disabled ? 0 : normalizedDB * (width || 0);

    setBarWidth(newBarWidth);
    setDampedBarWidth(
      _.max([newBarWidth, dampedBarWidth - 0.6]) || newBarWidth
    );
    setClipOpacity(
      normalizedDB === 1.0 ? 1 : _.max([clipOpacity - 0.02, 0]) || 0
    );
  }, 1000 / 20);

  return (
    <Stage height={height} width={width}>
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
          y={0}
          width={barWidth}
          height={height}
          fill={Colors.GREEN3}
        />
        <Rect
          x={barWidth - 10}
          y={0}
          width={10}
          height={height}
          fill={Colors.GREEN5}
        />
        <Rect
          x={dampedBarWidth - 2}
          y={0}
          width={2}
          height={height}
          fill={Colors.GRAY4}
        />
        <Rect
          x={width - 5}
          y={0}
          width={5}
          height={height}
          fill={Colors.RED3}
          opacity={clipOpacity}
        />
      </Layer>
    </Stage>
  );
}
