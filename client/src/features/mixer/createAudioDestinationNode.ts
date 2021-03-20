const ipcRenderer = window!.ipcRenderer;

function makeStartAudioDestinationNode(audioDestinationNode) {
  return ({ recordingStartedAt }) => {
    audioDestinationNode.port.postMessage({
      action: 'initialize',
    });
    ipcRenderer.send('audio-destination/start-playing', { recordingStartedAt });
  };
}

function makeStopAudioDestinationNode(audioDestinationNode) {
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
  await audioContext.audioWorklet.addModule('AudioDestinationNode.js');
  const audioDestinationNode = new AudioWorkletNode(
    audioContext,
    'AudioDestinationNode'
  );

  audioDestinationNode.port.onmessage = ({ data }) => {
    ipcRenderer.send('audio-destination/push-data', data);
  }

  return {
    audioDestinationNode,
    startAudioDestinationNode: makeStartAudioDestinationNode(
      audioDestinationNode
    ),
    stopAudioDestinationNode: makeStopAudioDestinationNode(
      audioDestinationNode
    ),
  };
}
