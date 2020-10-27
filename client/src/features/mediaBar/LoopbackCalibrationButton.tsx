import _ from 'lodash';
import React, { useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import {
  Button,
  Callout,
  Card,
  Classes,
  Dialog,
  Divider,
  FormGroup,
  H3,
  InputGroup,
  ControlGroup,
  OL,
  Tag,
} from '@blueprintjs/core';

import { useStream, useStreamData } from '../audioInput/AudioStreamHooks';
import { selectInputDevice, IInputDevice } from '../audioInput/audioSlice';
import AudioInputSelector from '../audioInput/AudioInputSelector';
import VolumeBar from '../audioInput/VolumeBar';
import { selectLoopbackLatencyMs, setLoopbackLatencyMs } from './mediaBarSlice';
import { selectRecordingState } from '../recording/recordingSlice';

interface LoopbackLatencyResult {
  success: boolean;
  latencyMs: number | null;
}

const PULSE_PERIOD_SECONDS = 0.5;
const PULSE_DUTY_CYCLE = 0.3;
const PULSE_COUNT = 3;
const PULSE_AMPLITUDE = 0.6;
const PULSE_HZ = 880;
const PULSE_SAMPLES = Math.floor(PULSE_PERIOD_SECONDS * PULSE_COUNT * 48000);

function createPulsesSource(audioContext) {
  // Create an empty three-second stereo buffer at the sample rate of the AudioContext
  var myArrayBuffer = audioContext.createBuffer(
    2,
    audioContext.sampleRate * PULSE_PERIOD_SECONDS * PULSE_COUNT,
    audioContext.sampleRate
  );

  for (var channel = 0; channel < myArrayBuffer.numberOfChannels; channel++) {
    // This gives us the actual array that contains the data
    var nowBuffering = myArrayBuffer.getChannelData(channel);
    for (var i = 0; i < myArrayBuffer.length; i++) {
      const periodSamples = PULSE_PERIOD_SECONDS * audioContext.sampleRate;
      if (
        i %
        periodSamples <
        audioContext.sampleRate * PULSE_PERIOD_SECONDS * PULSE_DUTY_CYCLE
      ) {
        const elapsedSeconds = i / audioContext.sampleRate;
        const sample =
          PULSE_AMPLITUDE * Math.sin(2 * Math.PI * elapsedSeconds * PULSE_HZ);
        nowBuffering[i] = sample;
      } else nowBuffering[i] = 0;
    }
  }

  // Get an AudioBufferSourceNode.
  // This is the AudioNode to use when we want to play an AudioBuffer
  var source = audioContext.createBufferSource();

  // set the buffer in the AudioBufferSourceNode
  source.buffer = myArrayBuffer;
  return source;
}

function startRecordingData(audioRecorderNode) {
  const delay = delayMs => new Promise(resolve => setTimeout(resolve, delayMs));

  return new Promise<Float32Array>(async (resolve, reject) => {
    audioRecorderNode.port.onmessage = function(event) {
      resolve(event.data);
    };

    audioRecorderNode.port.postMessage({
      action: 'start',
      samplesToCapture: PULSE_SAMPLES,
    });
  });
}

function calculateLoopbackLatency(
  recordedData: Float32Array
): LoopbackLatencyResult {
  const absBuffer = _.map(new Float32Array(recordedData), Math.abs);
  const max = _.max(absBuffer) || 1;
  const mean = _.mean(absBuffer);

  let detectedPulseLatencies: number[] = [];

  for (let index = 1; index < PULSE_SAMPLES; index++) {
    const abs1 = absBuffer[index - 1];
    const abs2 = absBuffer[index];

    const bigJump = value => value > mean + (max - mean) * 0.8;
    if (bigJump(abs2) && !bigJump(abs1)) {
      detectedPulseLatencies.push(
        (index % Math.floor(PULSE_PERIOD_SECONDS * 48000)) / 48000
      );
      index += PULSE_PERIOD_SECONDS * PULSE_DUTY_CYCLE * 48000;
    }
  }

  const meanLatency = _.mean(detectedPulseLatencies);
  console.log(detectedPulseLatencies);
  if (
    detectedPulseLatencies.length === PULSE_COUNT &&
    _.every(
      detectedPulseLatencies,
      latency => Math.abs(latency - meanLatency) < 0.003
    )
  ) {
    return {
      success: true,
      latencyMs: Math.round(meanLatency * 1000),
    };
  }

  return {
    success: false,
    latencyMs: null,
  };
}

async function detectLoopbackLatency(
  stream: MediaStream
): Promise<LoopbackLatencyResult> {
  // Pulses source
  const audioContext = new window.AudioContext({ sampleRate: 48000 });
  const pulsesSource = createPulsesSource(audioContext);
  pulsesSource.connect(audioContext.destination);

  // Audio input stream recording
  const sourceNode = audioContext.createMediaStreamSource(stream);
  const biquadFilterNode = new BiquadFilterNode(audioContext, {
    type: 'bandpass',
    Q: 10,
    frequency: PULSE_HZ,
  });
  await audioContext.audioWorklet.addModule('worklets/AudioRecorder.js');
  const audioRecorderNode = new AudioWorkletNode(audioContext, 'AudioRecorder');
  sourceNode.connect(biquadFilterNode);
  biquadFilterNode.connect(audioRecorderNode);

  // Start playing and recording at the same time
  pulsesSource.start();
  const recordedData = await startRecordingData(audioRecorderNode);

  return calculateLoopbackLatency(recordedData);
}

export default function() {
  const recordingState = useSelector(selectRecordingState);
  const defaultSelectedDevice = useSelector(selectInputDevice);

  const [isOpen, setIsOpen] = useState(false);
  const [selectedDevice, setSelectedDevice] = useState<IInputDevice | null>(
    defaultSelectedDevice
  );
  const [running, setRunning] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [pendingLoopbackLatencyMs, setPendingLoopbackLatencyMs] = useState<
    number | null
  >(null);

  // Audio data
  const stream = useStream(selectedDevice ? selectedDevice.deviceId : null);
  const { canChangeStream, someData, fetchData, setGainDB } = useStreamData(
    stream
  );

  const dispatch = useDispatch();

  const handleOpen = () => setIsOpen(true);
  const handleClose = () => {
    if (running) return;
    setIsOpen(false);
  };
  const handleRunClick = async () => {
    if (stream) {
      setRunning(true);
      const latencyResult = await detectLoopbackLatency(stream);
      console.log(latencyResult);
      if (latencyResult.success) {
        setPendingLoopbackLatencyMs(latencyResult.latencyMs);
        setErrorMessage(null);
      } else {
        setPendingLoopbackLatencyMs(null);
        setErrorMessage(
          `Cedar was unable to determine your system's loopback latency.
          Please try turning up your system audio, moving your headphones
          closer to your microphone, and/or selecting a different input
          device.`
        );
      }
      setRunning(false);
    }
  };
  const handleSaveAndClose = () => {
    dispatch(
      setLoopbackLatencyMs({
        loopbackLatencyMs: pendingLoopbackLatencyMs || 0,
      })
    );
    handleClose();
  };
  const handleClosed = () => {
    setErrorMessage(null);
    setPendingLoopbackLatencyMs(null);
    setIsOpen(false);
  };
  const hasRunOnce = !!errorMessage || !!pendingLoopbackLatencyMs;

  return (
    <>
      <Button
        outlined
        intent="primary"
        disabled={recordingState !== 'stopped'}
        onClick={handleOpen}
      >
        Calibrate
      </Button>
      <Dialog
        className={Classes.DARK}
        style={{ width: 600 }}
        icon="tree"
        title="Calibrate loopback latency!"
        isOpen={isOpen && recordingState === 'stopped'}
        onOpened={() => {
          if (selectedDevice !== defaultSelectedDevice)
            setSelectedDevice(defaultSelectedDevice);
        }}
        onClose={handleClose}
        onClosed={handleClosed}
      >
        <div className={Classes.DIALOG_BODY}>
          <H3>What is loopback latency?</H3>
          <p>
            <span style={{ fontWeight: 'bold' }}>
              Loopback latency is the amount of time it takes for audio to
              travel out of your computer through the speakers then back in
              through the microphone.
            </span>{' '}
            It is important for Cedar to know this latency value so it can
            correct for it before sending audio on to the next musician in the
            chain. Loopback latency is typically less than 200 ms.
          </p>
          <Callout style={{ marginBottom: 10 }}>
            <span style={{ fontWeight: 'bold' }}>NOTE:</span> Loopback latency
            will vary from system to system, including the PC or Mac used and
            the headphones and input devices used. So it ideal to calibrate
            using the same equipment you will use when performing through Cedar.
          </Callout>
          <H3>Instructions</H3>
          <OL>
            <li>
              <span style={{ fontWeight: 'bold' }}>
                Select the input device
              </span>{' '}
              (probably a microphone) you want to calibrate with. Ideally, this
              would be the same device you use to perform, but another device
              will work well enough if that is not possible.
            </li>
            <li>
              <span style={{ fontWeight: 'bold' }}>
                Position your headphones
              </span>{' '}
              or speakers close to the audio input device.
            </li>
            <li>
              <span style={{ fontWeight: 'bold' }}>Click "Run"</span> to play
              the three tones Cedar uses to calibrate loopback latency.
            </li>
          </OL>
          <H3>Calibrate</H3>
          <Card
            style={{
              display: 'flex',
              flexDirection: 'column',
              maxWidth: 300,
              marginLeft: 'auto',
              marginRight: 'auto',
            }}
          >
            <div style={{ marginBottom: 10 }}>
              <AudioInputSelector
                setSelectedDevice={setSelectedDevice}
                selectedDevice={selectedDevice}
              />
            </div>
            <VolumeBar
              height={20}
              width={250}
              fetchData={fetchData}
              disabled={!someData}
            />
            <Divider />
            <Button
              intent="primary"
              outlined={!!pendingLoopbackLatencyMs}
              onClick={handleRunClick}
              disabled={running}
            >
              {running ? 'Running...' : hasRunOnce ? 'Run again' : 'Run'}
            </Button>
            {pendingLoopbackLatencyMs && (
              <>
                <Tag large style={{ marginTop: 5, marginBottom: 5 }}>
                  Loopback latency:{' '}
                  <span style={{ fontWeight: 'bold' }}>
                    {pendingLoopbackLatencyMs}
                  </span>{' '}
                  ms
                </Tag>{' '}
                <Button intent="success" onClick={handleSaveAndClose}>
                  Save and close
                </Button>
              </>
            )}
          </Card>
          {errorMessage && (
            <Callout intent="danger" style={{ marginTop: 5 }}>
              {errorMessage}
            </Callout>
          )}
        </div>
      </Dialog>
    </>
  );
}
