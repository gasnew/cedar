import { v4 as uuidv4 } from 'uuid';

const ipcRenderer = window!.ipcRenderer;

function makeStartAudioDestinationNode(audioDestinationNode, correlationId) {
  return ({ recordingStartedAt }) => {
    ipcRenderer.send('audio-destination/start-playing', {
      recordingStartedAt,
      correlationId,
    });
    audioDestinationNode.port.postMessage({
      action: 'initialize',
      recordingStartedAt,
    });
  };
}

function makeStopAudioDestinationNode(audioDestinationNode, correlationId) {
  return () => {
    audioDestinationNode.port.postMessage({
      action: 'stop',
    });
    ipcRenderer.send('audio-destination/stop-playing');
  };
}

export default async function createAudioDestinationNode(
  audioContext: AudioContext
) {
  // NOTE(gnewman): The correlation ID lets the backend associate incoming data
  // with our particular destination node. Only one destination node can write
  // to the backend at a time.
  const correlationId = uuidv4();
  await audioContext.audioWorklet.addModule('AudioDestinationNode.js');
  const audioDestinationNode = new AudioWorkletNode(
    audioContext,
    'AudioDestinationNode'
  );

  audioDestinationNode.port.onmessage = ({ data }) => {
    ipcRenderer.send('audio-destination/push-data', {
      data,
      correlationId,
    });
  };

  return {
    audioDestinationNode,
    startAudioDestinationNode: makeStartAudioDestinationNode(
      audioDestinationNode,
      correlationId
    ),
    stopAudioDestinationNode: makeStopAudioDestinationNode(
      audioDestinationNode,
      correlationId
    ),
  };
}
