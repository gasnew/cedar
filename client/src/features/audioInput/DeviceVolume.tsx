import _ from 'lodash';
import React, { useEffect, useState } from 'react';
import { Slider, Card, H4, Button, H5, MenuItem } from '@blueprintjs/core';

import VolumeBar from './VolumeBar';


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

interface DataResponse {
  someData: boolean;
  fetchData: () => Uint8Array;
  setGainDB: (number) => void;
}

function useStreamData(stream: MediaStream | null): DataResponse {
  const [analyzer, setAnalyzer] = useState<AnalyserNode | null>(null);
  const [gainNode, setGainNode] = useState<GainNode | null>(null);
  const [dataArray, setDataArray] = useState<Uint8Array>(new Uint8Array());

  useEffect(() => {
    if (!!!stream) setAnalyzer(null);
    else {
      const audioContext = new window.AudioContext();
      const analyzer = audioContext.createAnalyser();
      const mediaSource = audioContext.createMediaStreamSource(stream);
      const gainNode = audioContext.createGain();

      mediaSource.connect(gainNode);
      gainNode.connect(analyzer);
      analyzer.fftSize = 2048;
      gainNode.gain.value = 1;

      setAnalyzer(analyzer);
      setGainNode(gainNode);
      setDataArray(new Uint8Array(analyzer.fftSize));
    }
  }, [stream]);

  const fetchData = () => {
    if (!!analyzer) analyzer.getByteTimeDomainData(dataArray);
    return dataArray;
  };
  const setGainDB = gainDB => {
    if (!!gainNode) gainNode.gain.value = 1;
  };

  return { someData: !!analyzer, fetchData, setGainDB };
}

interface Props {
  deviceId: string | null;
  gainDB: number;
}
export default function DeviceVolume({ deviceId, gainDB }: Props) {
  const { someData, fetchData, setGainDB } = useStreamData(useStream(deviceId));

  return (
    <VolumeBar
      fetchData={fetchData}
      disabled={!someData}
    />
  );
}
