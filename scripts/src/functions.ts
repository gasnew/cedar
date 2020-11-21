import _ from 'lodash';
import fs from 'fs';
//import { Worker } from 'worker_threads';
import Worker from 'web-worker';
import axios from 'axios';
import { Base64 } from 'js-base64';
import { WaveFile } from 'wavefile';

interface Recording {
  id: string;
  roomId: string;
  trackIds: string[];
}
type EncodedTrackData = Uint8Array[];
type TrackData = Float32Array;
interface DecodedTrack {
  id: string;
  data: TrackData;
}
interface Track {
  id: string;
  data: EncodedTrackData;
}
interface EncodedRecordingData {
  tracks: Array<Track>;
}

async function fetchRoomRecordings(
  apiUrl: string,
  roomId: string
): Promise<Recording[]> {
  console.log(`[x] Fetching room ${roomId} tracks...`);
  const { data: recordings } = await axios.get(`${apiUrl}/recordings`, {
    params: {
      roomId,
    },
  });
  console.log(`[-] Found ${recordings.length} recordings`);
  return _.map(recordings, recording => ({
    id: recording.id,
    roomId: roomId,
    trackIds: recording.trackIds,
  }));
}

async function downloadRecordingData(
  apiUrl: string,
  recording: Recording
): Promise<EncodedRecordingData> {
  console.log(`[x] Downloading recording ${recording.id} data...`);
  const cursorsByTrack = _.join(
    _.map(recording.trackIds, trackId => `cursorsByTrack[${trackId}]=`),
    '&'
  );
  const response = await axios.get(`${apiUrl}/tracks?${cursorsByTrack}`, {
    params: {
      roomId: recording.roomId,
    },
  });

  const tracksWithData = _.filter(
    response.data,
    track => track.data.length > 0
  );
  return {
    tracks: _.map(tracksWithData, track => ({
      id: track.id,
      data: _.map(track.data, Base64.toUint8Array),
    })),
  };
}

function decodeTrackData(track: Track): Promise<DecodedTrack> {
  return new Promise((resolve, reject) => {
    const decodedData: Array<Float32Array> = [];
    const opusWorker = new Worker('./src/webopus.asm.min.js');

    opusWorker.onmessage = ({ data: { frames, end } }) => {
      decodedData.push(frames);
      if (end) {
        const totalLength = _.sumBy(decodedData, 'length');
        const finalBuffer = new Float32Array(totalLength);
        let startOfFrameIndex = 0;
        for (let i = 0; i < decodedData.length; i++) {
          for (let j = 0; j < decodedData[i].length; j++) {
            finalBuffer[startOfFrameIndex + j] = decodedData[i][j];
          }
          startOfFrameIndex += decodedData[i].length;
        }
        opusWorker.terminate();
        resolve({
          id: track.id,
          data: finalBuffer,
        });
      }
    };
    opusWorker.postMessage({
      op: 'begin',
      stream: track.id,
      sampleRate: 48000,
      numChannels: 1,
      packet: track.data[0],
    });
    _.forEach(_.tail(track.data), packet => {
      opusWorker.postMessage({
        op: 'proc',
        stream: track.id,
        packet,
      });
    });

    opusWorker.postMessage({
      op: 'end',
      stream: track.id,
    });
  });
}

function sumDecodedData(data: TrackData[]): TrackData {
  console.log(`[x] Combining ${data.length} tracks...`);
  const minLength = _.min(_.map(data, 'length'));
  const buffer = new Float32Array(minLength);
  for (let i = 0; i < minLength; i++) {
    buffer[i] = 0.0;
    for (let j = 0; j < data.length; j++) {
      buffer[i] += data[j][i] * 0.6;
    }
  }
  return buffer;
}

function writeDataToFile(path: string, name: string, data: TrackData) {
  const filename = `${path}/${name}.wav`;
  let wav = new WaveFile();
  console.log(`[x] Writing ${filename}`);

  // Create a mono wave file, 44.1 kHz, 32-bit and 4 samples
  const buffer = new Int32Array(data.length);
  for (let i = 0; i < buffer.length; i++) {
    buffer[i] = data[i] * 2147483647;
  }

  wav.fromScratch(1, 48000, '32', buffer);
  fs.writeFileSync(filename, wav.toBuffer());
}

function mkDir(dir: string): void {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir);
  }
}

interface Props {
  roomId: string;
  apiUrl: string;
  outputFolder: string;
}

export default function({ roomId, apiUrl, outputFolder }: Props) {
  fetchRoomRecordings(apiUrl, roomId)
    .then(async recordings => {
      const outputPath = `./${outputFolder}`;
      mkDir(outputPath);
      const dir = `${outputPath}/room-${roomId}`;
      mkDir(dir);

      for (let i = 0; i < recordings.length; i++) {
        const recording = recordings[i];
        console.log(`[-] Starting on recording ${i + 1}/${recordings.length}`);
        const encodedData = await downloadRecordingData(apiUrl, recording);
        console.log(`[x] Decoding track data...`);
        const decodedTracks = await Promise.all(
          _.map(encodedData.tracks, track => decodeTrackData(track))
        );

        const recordingDir = `${dir}/recording-${recording.id}`;
        const tracksDir = `${recordingDir}/tracks`;
        mkDir(recordingDir);
        mkDir(tracksDir);
        _.forEach(decodedTracks, track =>
          writeDataToFile(tracksDir, track.id, track.data)
        );

        const consolidatedTrackData = sumDecodedData(
          _.map(decodedTracks, 'data')
        );
        writeDataToFile(recordingDir, recording.id, consolidatedTrackData);
      }
    })
    .then(() => console.log('[!] Done!'));
}
