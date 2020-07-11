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

// NOTE(gnewman):
interface MyStage extends Stage {
  content: HTMLDivElement;
}
interface Props {
  fetchData: () => Uint8Array;
  disabled: boolean;
}

export default function({ fetchData, disabled }: Props) {
  const [barWidth, setBarWidth] = useState(0);
  const [dampedBarWidth, setDampedBarWidth] = useState(0);
  const [clipOpacity, setClipOpacity] = useState(0);
  const [stageDiv, setStageDiv] = useState<HTMLDivElement | null>(null);
  const [canvas, setCanvas] = useState<HTMLCanvasElement | null>(null);

  useInterval(() => {
    const offset = 128.0; // The offset of the signal from 0 amplitude
    const amplitudeNormalized =
      ((_.max(fetchData()) || offset) - offset) / 127.0;
    const newBarWidth = amplitudeNormalized * (canvas?.width || 0);

    setBarWidth(newBarWidth);
    setDampedBarWidth(
      _.max([newBarWidth, dampedBarWidth - 0.6]) || newBarWidth
    );
    setClipOpacity(
      amplitudeNormalized == 1.0 ? 1 : _.max([clipOpacity - 0.02, 0]) || 0
    );
  }, 1000 / 60);

  if (canvas && stageDiv) {
    stageDiv.style.width = '100px';
    stageDiv.style.height = '100px';
    canvas.style.width = '100px';
    canvas.style.height = '100px';
    // ...then set the internal size to match
    canvas.width = canvas.offsetWidth;
    canvas.height = canvas.offsetHeight;
  }

  return (
    <Stage
      style={{ height: '100%', width: '100%' }}
      ref={node =>
        node && setStageDiv((node as MyStage | null)?.content || null)
      }
    >
      <Layer ref={node => node && setCanvas(node.canvas._canvas)}>
        {canvas && (
          <>
            <Rect
              x={0}
              y={0}
              width={canvas.width}
              height={canvas.height}
              fill={Colors.DARK_GRAY3}
            />
            <Rect
              x={0}
              y={0}
              width={barWidth}
              height={canvas.height}
              fill={Colors.GREEN3}
            />
            <Rect
              x={barWidth - 10}
              y={0}
              width={10}
              height={canvas.height}
              fill={Colors.GREEN5}
            />
            <Rect
              x={dampedBarWidth - 2}
              y={0}
              width={2}
              height={canvas.height}
              fill={Colors.GRAY4}
            />
            <Rect
              x={canvas.width - 5}
              y={0}
              width={5}
              height={canvas.height}
              fill={Colors.RED3}
              opacity={clipOpacity}
            />
          </>
        )}
      </Layer>
    </Stage>
  );
}
