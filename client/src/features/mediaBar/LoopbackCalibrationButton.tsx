import _ from 'lodash';
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import {
  Button,
  Callout,
  Card,
  Classes,
  Dialog,
  Divider,
  H3,
  OL,
  Tag,
} from '@blueprintjs/core';
import Speaker from 'speaker';


import { useStream } from '../audioInput/AudioStreamHooks';
import {
  selectInputDevice,
  selectOutputDevice,
  IInputDevice,
  IOutputDevice,
} from '../audioInput/audioSlice';
import AudioInputSelector from '../audioInput/AudioInputSelector';
import VolumeBar from '../audioInput/VolumeBar';
import { usePatch } from '../feathers/FeathersHooks';
import { setLoopbackLatencyMs } from './mediaBarSlice';
import AudioOutputSelector from '../mixer/AudioOutputSelector';
import { selectRecordingState } from '../recording/recordingSlice';
import { setMusicianLoopbackLatencyMs } from '../musicians/musiciansSlice';
import { selectRoom } from '../room/roomSlice';

// Create the Speaker instance
//const speaker = new Speaker({
  //channels: 2,          // 2 channels
  //bitDepth: 16,         // 16-bit samples
  //sampleRate: 44100     // 44,100 Hz sample rate
//});

//// PCM data from stdin gets piped into the speaker
//process.stdin.pipe(speaker);
interface LoopbackLatencyResult {
  success: boolean;
  latencyMs: number | null;
}

const PULSE_PERIOD_SECONDS = 0.5;
const PULSE_DUTY_CYCLE = 0.3;
const PULSE_COUNT = 20;
const PULSE_AMPLITUDE = 0.6;
const PULSE_HZ = 880;
const PULSE_SAMPLES = Math.floor(PULSE_PERIOD_SECONDS * PULSE_COUNT * 48000);

function createPulsesSource(audioContext) {
  // Create an empty three-second stereo buffer at the sample rate of the AudioContext
  const myArrayBuffer = audioContext.createBuffer(
    2,
    audioContext.sampleRate * PULSE_PERIOD_SECONDS * PULSE_COUNT,
    audioContext.sampleRate
  );

  for (var channel = 0; channel < myArrayBuffer.numberOfChannels; channel++) {
    // This gives us the actual array that contains the data
    const nowBuffering = myArrayBuffer.getChannelData(channel);
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
  const source = audioContext.createBufferSource();

  // set the buffer in the AudioBufferSourceNode
  source.buffer = myArrayBuffer;
  return source;
}

function startRecordingData(audioRecorderNode, recordingStartedAt) {
  return new Promise<Float32Array>((resolve, reject) => {
    audioRecorderNode.port.onmessage = function(event) {
      resolve(event.data);
    };

    audioRecorderNode.port.postMessage({
      action: 'start',
      samplesToCapture: PULSE_SAMPLES,
      recordingStartedAt,
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

  console.log(detectedPulseLatencies);
  const meanLatency = _.mean(detectedPulseLatencies);
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

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function detectLoopbackLatency(
  stream: MediaStream,
  audioElement: HTMLAudioElement
): Promise<LoopbackLatencyResult> {
  // CONNECT PULSES SOURCE TO OUTPUT DEVICE
  const outputAudioContext = new window.AudioContext({ sampleRate: 48000 });
  const pulsesSource = createPulsesSource(outputAudioContext);
  const outputDeviceNode = outputAudioContext.createMediaStreamDestination();
  // NOTE(gnewman): Sometimes routing an AudioContext to a destination, even if
  // you don't need it, helps the AudioContext time things correctly.
  const outputGain = outputAudioContext.createGain();
  outputGain.gain.value = 0;
  pulsesSource.connect(outputGain);
  outputGain.connect(outputAudioContext.destination);
  pulsesSource.connect(outputDeviceNode);
  audioElement.srcObject = outputDeviceNode.stream;
  audioElement.addEventListener('ratechange', event => {
    console.log('The playback rate changed.');
  });

  // START AUDIO ELEMENT, AND SLEEP
  await audioElement.play();
  // NOTE(gnewman): HTMLAudioElement is a little finickey and sometimes takes a
  // moment to fill up its buffer and start playback sensibly, so we sleep for
  // a bit to give it time to do its thing. This also mimicks the actual core
  // Cedar audio loop where audioElement.play() is called when the chain is
  // arranged (when the AudioContext for your audio sources needs to be
  // rebuilt), then audio data starts coming in much later when recording
  // starts.
  await sleep(500);

  // CONNECT INPUT DEVICE TO AUDIO RECORDER
  const inputAudioContext = new window.AudioContext({ sampleRate: 48000 });
  const sourceNode = inputAudioContext.createMediaStreamSource(stream);
  const biquadFilterNode = new BiquadFilterNode(inputAudioContext, {
    type: 'bandpass',
    Q: 10,
    frequency: PULSE_HZ,
  });
  await inputAudioContext.audioWorklet.addModule('worklets/AudioRecorder.js');
  const audioRecorderNode = new AudioWorkletNode(
    inputAudioContext,
    'AudioRecorder'
  );
  sourceNode.connect(biquadFilterNode);
  biquadFilterNode.connect(audioRecorderNode);
  // NOTE(gnewman): Sometimes routing an AudioContext to a destination, even if
  // you don't need it, helps the AudioContext time things correctly.
  const inputGain = inputAudioContext.createGain();
  inputGain.gain.value = 0;
  audioRecorderNode.connect(inputGain);
  inputGain.connect(inputAudioContext.destination);

  // START RECORDING AND PLAYBACK AT THE SAME TIME
  pulsesSource.start();
  // We use this timestamp to adjust the recording
  const recordingStartedAt = Date.now();
  const recordedData = await startRecordingData(
    audioRecorderNode,
    recordingStartedAt
  );

  // CLEAN UP
  inputAudioContext.close();
  outputAudioContext.close();
  await audioElement.pause();

  return calculateLoopbackLatency(recordedData);
}

interface DataResponse {
  canChangeStream: boolean;
  someData: boolean;
  fetchData: () => Uint8Array;
}

export function useSimpleStreamFetcher(
  stream: MediaStream | null
): DataResponse {
  const [analyzer, setAnalyzer] = useState<AnalyserNode | null>(null);
  const [dataArray, setDataArray] = useState<Uint8Array>(new Uint8Array());
  const [canChangeStream, setCanChangeStream] = useState<boolean>(true);

  useEffect(
    () => {
      if (!stream) setAnalyzer(null);
      else {
        const audioContext = new window.AudioContext({
          sampleRate: 48000,
        });
        const analyzer = audioContext.createAnalyser();
        const mediaSource = audioContext.createMediaStreamSource(stream);

        mediaSource.connect(analyzer);

        // Has to be a power of 2. At the default sample rate of 48000, this
        // size should be enough to let us fetch all samples assuming we are
        // fetching every 1/60th of a second (48000 / 60 = 800 samples).
        analyzer.fftSize = 1024;

        setAnalyzer(analyzer);
        setDataArray(new Uint8Array(analyzer.fftSize));

        return () => {
          setCanChangeStream(false);
          audioContext.close().then(() => {
            setCanChangeStream(true);
          });
        };
      }
    },
    [stream]
  );

  const fetchData = useCallback(
    () => {
      if (analyzer) analyzer.getByteTimeDomainData(dataArray);
      return dataArray;
    },
    [analyzer, dataArray]
  );

  return {
    canChangeStream,
    someData: !!analyzer,
    fetchData,
  };
}
export default function() {
  const recordingState = useSelector(selectRecordingState);
  const defaultSelectedInputDevice = useSelector(selectInputDevice);
  const defaultSelectedOutputDevice = useSelector(selectOutputDevice);
  const { musicianId } = useSelector(selectRoom);

  const [isOpen, setIsOpen] = useState(false);
  const [
    selectedInputDevice,
    setSelectedInputDevice,
  ] = useState<IInputDevice | null>(defaultSelectedInputDevice);
  const [
    selectedOutputDevice,
    setSelectedOutputDevice,
  ] = useState<IOutputDevice | null>(defaultSelectedOutputDevice);
  const audioElement = useMemo<HTMLAudioElement>(() => new Audio(), []);
  const [running, setRunning] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [pendingLoopbackLatencyMs, setPendingLoopbackLatencyMs] = useState<
    number | null
  >(null);

  // Audio data
  const stream = useStream(
    selectedInputDevice ? selectedInputDevice.deviceId : null
  );
  const { someData, fetchData } = useSimpleStreamFetcher(stream);

  const [patchMusician] = usePatch('musicians');

  const dispatch = useDispatch();

  useEffect(
    () => {
      if (selectedOutputDevice)
        audioElement.setSinkId(selectedOutputDevice.deviceId);
    },
    [audioElement, selectedOutputDevice]
  );

  const handleOpen = () => setIsOpen(true);
  const handleClose = () => {
    if (running) return;
    setIsOpen(false);
  };
  const handleRunClick = async () => {
    if (stream && audioElement) {
      setRunning(true);
      const latencyResult = await detectLoopbackLatency(stream, audioElement);
      if (latencyResult.success) {
        setPendingLoopbackLatencyMs(latencyResult.latencyMs);
        setErrorMessage(null);
      } else {
        setPendingLoopbackLatencyMs(null);
        setErrorMessage(
          `Cedar was unable to determine loopback latency. Try turning up your
          computer audio and moving your headphones closer to your microphone.
          Also make sure you have the right input and output devices selected.`
        );
      }
      setRunning(false);
    }
  };
  const handleSaveAndClose = () => {
    if (!musicianId) return;
    dispatch(
      setLoopbackLatencyMs({
        loopbackLatencyMs: pendingLoopbackLatencyMs || 0,
      })
    );
    dispatch(
      setMusicianLoopbackLatencyMs({
        musicianId,
        loopbackLatencyMs: pendingLoopbackLatencyMs || 0,
      })
    );
    patchMusician(musicianId, {
      loopbackLatencyMs: pendingLoopbackLatencyMs || 0,
    });
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
          if (selectedInputDevice !== defaultSelectedInputDevice)
            setSelectedInputDevice(defaultSelectedInputDevice);
          if (selectedOutputDevice !== defaultSelectedOutputDevice)
            setSelectedOutputDevice(defaultSelectedOutputDevice);
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
            chain. Loopback latency is typically less than 300 ms.
          </p>
          <Callout style={{ marginBottom: 10 }}>
            <span style={{ fontWeight: 'bold' }}>NOTE:</span> Loopback latency
            will vary depending on the equipment you use--PC or Mac, headphones,
            and input devices. So it is ideal to calibrate using the same
            equipment you will use when performing through Cedar.
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
                setSelectedDevice={setSelectedInputDevice}
                selectedDevice={selectedInputDevice}
              />
            </div>
            <div style={{ position: 'relative', marginBottom: 5 }}>
              <VolumeBar
                height={20}
                width={250}
                fetchData={fetchData}
                disabled={!someData}
              />
            </div>
            <div style={{ marginBottom: 10 }}>
              <AudioOutputSelector
                setSelectedDevice={setSelectedOutputDevice}
                selectedDevice={selectedOutputDevice}
              />
            </div>
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
                <Divider />
                <Tag large minimal style={{ marginBottom: 5 }}>
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
