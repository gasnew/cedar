import _ from 'lodash';
import React, { useCallback, useEffect, useRef } from 'react';
import { Colors } from '@blueprintjs/core';

export function Canvas({ draw, style }) {
  const canvasRef = useRef(null);
  const animationFrameId = useRef<number | null>(null);

  useEffect(
    () => {
      const canvas = canvasRef.current;
      if (!canvas) return;

      const context = (canvas as HTMLCanvasElement).getContext('2d');

      const render = () => {
        draw(context);
        animationFrameId.current = window.requestAnimationFrame(render);
      };
      render();

      return () => {
        if (animationFrameId.current)
          window.cancelAnimationFrame(animationFrameId.current);
      };
    },
    [draw]
  );

  return (
    <canvas
      height={style.height || 1}
      width={style.width || 1}
      ref={canvasRef}
      style={style}
    />
  );
}

interface Props {
  fetchData: () => Uint8Array;
  disabled: boolean;
  height?: number;
  width?: number;
}

export default function({ fetchData, disabled, height, width }: Props) {
  const barWidth = useRef(0);
  const dampedBarWidth = useRef(0);
  const clipOpacity = useRef(0);

  const draw = useCallback(
    ctx => {
      const offset = 128.0; // The offset of the signal from 0 amplitude
      const amplitudeNormalized =
        ((_.max(fetchData()) || offset) - offset) / 127.0;
      const amplitudeDB = 20 * Math.log10(amplitudeNormalized);
      const truncatedAmplitude = amplitudeDB < -40 ? -40 : amplitudeDB;
      const normalizedDB = (40 + truncatedAmplitude) / 40;
      const newBarWidth = disabled ? 0 : normalizedDB * (ctx.canvas.width || 0);

      // Resize the canvas to the parent container
      const parentRect = ctx.canvas.parentNode.getBoundingClientRect();
      ctx.canvas.height = height || parentRect.height;
      ctx.canvas.width = width || parentRect.width;

      barWidth.current = newBarWidth;
      dampedBarWidth.current =
        _.max([newBarWidth, dampedBarWidth.current - 0.6]) || newBarWidth;
      clipOpacity.current =
        normalizedDB === 1.0 ? 1 : _.max([clipOpacity.current - 0.02, 0]) || 0;

      ctx.clearRect(0, 0, ctx.canvas.width, ctx.canvas.height);
      // background
      ctx.fillStyle = Colors.DARK_GRAY2;
      ctx.fillRect(0, 0, ctx.canvas.width, ctx.canvas.height);
      // green bar
      ctx.fillStyle = Colors.GREEN3;
      ctx.fillRect(0, 0, barWidth.current, ctx.canvas.height);
      // green highlight
      ctx.fillStyle = Colors.GREEN5;
      ctx.fillRect(barWidth.current - 10, 0, 10, ctx.canvas.height);
      // peak marker
      ctx.fillStyle = Colors.GRAY4;
      ctx.fillRect(dampedBarWidth.current - 2, 0, 2, ctx.canvas.height);
      // clip indicator
      ctx.fillStyle = Colors.RED3;
      ctx.globalAlpha = clipOpacity.current;
      ctx.fillRect(ctx.canvas.width - 5, 0, 5, ctx.canvas.height);
      ctx.globalAlpha = 1;
    },
    [disabled, fetchData, height, width]
  );

  return <Canvas draw={draw} style={{ borderRadius: 3 }} />;
}
