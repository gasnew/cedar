import _ from 'lodash';
import React, { useEffect, useState } from 'react';
import { Slider, Card, H4, Button, H5, MenuItem } from '@blueprintjs/core';

import VolumeBar from './VolumeBar';

interface Props {
  deviceId: string | null;
}

function useStream(deviceId: string | null) {
  const [stream, setStream] = useState<MediaStream | null>(null);

  useEffect(() => {
    if (!!!deviceId) setStream(null);
    else
      navigator.mediaDevices
        .getUserMedia({
          audio: {
            deviceId: { exact: deviceId },
            autoGainControl: false,
            echoCancellation: false,
            noiseSuppression: false,
          },
        })
        .then(setStream);
  }, [deviceId]);

  return stream;
}

function useStreamData(
  stream: MediaStream | null
): [boolean, () => Uint8Array] {
  const [analyzer, setAnalyzer] = useState<AnalyserNode | null>(null);
  const [dataArray, setDataArray] = useState<Uint8Array>(new Uint8Array());

  useEffect(() => {
    if (!!!stream) setAnalyzer(null);
    else {
      const audioContext = new window.AudioContext();
      const analyzer = audioContext.createAnalyser();
      const mediaSource = audioContext.createMediaStreamSource(stream);

      mediaSource.connect(analyzer);
      analyzer.fftSize = 2048;

      setAnalyzer(analyzer);
      setDataArray(new Uint8Array(analyzer.fftSize));
    }
  }, [stream]);

  const fetchData = () => {
    if (!!analyzer) analyzer.getByteTimeDomainData(dataArray);
    return dataArray;
  };

  return [!!analyzer, fetchData];
}

export default function DeviceVolume({ deviceId }: Props) {
  const [someData, fetchData] = useStreamData(useStream(deviceId));

  return (
    <VolumeBar
      width={30}
      height={_.max(fetchData()) || 0}
      fetchData={fetchData}
      disabled={!someData}
    />
  );
}
