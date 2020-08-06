import _ from 'lodash';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

interface DataResponse {
  someData: boolean;
  fetchData: () => Uint8Array;
  setGainDB: (number) => void;
}

export function useRoomAudio(): DataResponse {
  const [analyzer, setAnalyzer] = useState<AnalyserNode | null>(null);
  const [gainNode, setGainNode] = useState<GainNode | null>(null);
  const [dataArray, setDataArray] = useState<Uint8Array>(new Uint8Array());

  useEffect(() => {
    const launchAudioNodes = async () => {
      const audioContext = new window.AudioContext();
      await audioContext.audioWorklet.addModule('RoomAudioPlayer.js');
      const gainNode = audioContext.createGain();
      const analyzer = audioContext.createAnalyser();
      const roomAudioNode = new AudioWorkletNode(
        audioContext,
        'RoomAudioPlayer'
      );

      roomAudioNode.connect(gainNode);
      gainNode.connect(analyzer);
      gainNode.connect(audioContext.destination);

      // Has to be a power of 2. At the default sample rate of 48000, this
      // size should be enough to let us fetch all samples assuming we are
      // fetching every 1/60th of a second (48000 / 60 = 800 samples).
      analyzer.fftSize = 1024;
      gainNode.gain.value = 1;

      setAnalyzer(analyzer);
      setGainNode(gainNode);
      setDataArray(new Uint8Array(analyzer.fftSize));
    };
    launchAudioNodes();
  }, []);

  const fetchData = () => {
    if (analyzer) analyzer.getByteTimeDomainData(dataArray);
    return dataArray;
  };
  const setGainDB = gainDB => {
    if (gainNode) gainNode.gain.value = Math.pow(10, gainDB / 20);
  };

  return { someData: !!analyzer, fetchData, setGainDB };
}
