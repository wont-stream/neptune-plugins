import type { LunaUnload } from "@luna/core";
import {
  MediaItem,
  PlayState,
  type redux,
  StyleTag,
  ipcRenderer,
} from "@luna/lib";
import { storage } from "./Settings";

export { Settings } from "./Settings";

export const unloads = new Set<LunaUnload>();

import css from "file://index.css";
import { Root } from "./types";

//#region CSS
new StyleTag("CatJam", unloads, css).add();
//#endregion

//#region CatJam videoElement Element
const videoElement: HTMLVideoElement = document.createElement("video");

videoElement.src =
  "https://cdn.jsdelivr.net/gh/wont-stream/neptune-plugins@dev/plugins/Catto/src/catjam.webm";

videoElement.classList.add("CatJam");
videoElement.style = `--catjam-opacity: ${storage.opacity / 100};`;

videoElement.loop = true;
videoElement.muted = true;
//#endregion

//#region Append CatJam to the media imagery
const appendCatJam = () => {
  const smallAlbumArt = document.querySelector(
    '[data-test="current-media-imagery"]',
  );
  if (smallAlbumArt) return smallAlbumArt.append(videoElement);

  return setTimeout(appendCatJam, 1);
};
appendCatJam();
//#endregion

//#region Add CatJam to unloads
unloads.add(() => videoElement?.remove());
//#endregion
type AudioData = null | Root;
let audioData: AudioData = null;

const videoElementDefaultBPM = 135.48;
async function getPlaybackRate() {
  if (audioData && audioData?.audioFeatures?.tempo) {
    let trackBPM = audioData?.audioFeatures?.tempo; // BPM of the current track
    let bpmToUse = await getBetterBPM(trackBPM);
    let playbackRate = 1;
    if (bpmToUse) {
      playbackRate = bpmToUse / videoElementDefaultBPM;
    }
    console.log("[CAT-JAM] Track BPM:", trackBPM);
    console.log(
      "[CAT-JAM] Cat jam synchronized, playback rate set to:",
      playbackRate,
    );

    return playbackRate; // Return the calculated playback rate
  } else {
    console.warn(
      "[CAT-JAM] BPM data not available for this track, cat will not be jamming accurately :(",
    );
    return 1; // Return default playback rate if BPM data is not available
  }
}

async function getBetterBPM(currentBPM: number) {
  let betterBPM = currentBPM;
  try {
    if (audioData?.audioFeatures) {
      const danceability = Math.round(
        100 * audioData.audioFeatures.danceability,
      );
      const energy = Math.round(100 * audioData.audioFeatures.energy);
      betterBPM = calculateBetterBPM(danceability, energy, currentBPM);
    }
  } catch (error) {
    console.error("[CAT-JAM] Could not get audio features: ", error);
  } finally {
    return betterBPM;
  }
}

const energyTreshold = 0.5;
const danceabilityTreshold = 0.5;
const maxBPM = 100;
const bpmThreshold = 0.8; // 80 bpm
function calculateBetterBPM(
  danceability: number,
  energy: number,
  currentBPM: number,
) {
  let danceabilityWeight = 0.9;
  let energyWeight = 0.6;
  let bpmWeight = 0.6;

  const normalizedBPM = currentBPM / 100;
  const normalizedDanceability = danceability / 100;
  const normalizedEnergy = energy / 100;

  if (normalizedDanceability < danceabilityTreshold) {
    danceabilityWeight *= normalizedDanceability;
  }

  if (normalizedEnergy < energyTreshold) {
    energyWeight *= normalizedEnergy;
  }
  // increase bpm weight if the song is slow
  if (normalizedBPM < bpmThreshold) {
    bpmWeight = 0.9;
  }

  const weightedAverage =
    (normalizedDanceability * danceabilityWeight +
      normalizedEnergy * energyWeight +
      normalizedBPM * bpmWeight) /
    (1 - danceabilityWeight + 1 - energyWeight + bpmWeight);
  let betterBPM = weightedAverage * maxBPM;

  console.log({
    danceabilityWeight,
    energyWeight,
    currentBPM,
    weightedAverage,
    betterBPM,
    bpmWeight,
  });

  if (betterBPM > currentBPM) {
    betterBPM = (betterBPM + currentBPM) / 2;
  }

  if (betterBPM < currentBPM) {
    betterBPM = Math.max(betterBPM, 70);
  }

  return betterBPM;
}

async function syncTiming(startTime: number, progress: number) {
  if (videoElement) {
    if (PlayState.playing) {
      //progress = progress / 1000; // Convert progress from milliseconds to seconds

      if (audioData?.audioAnalysis?.beats) {
        // Find the nearest upcoming beat based on current progress
        const upcomingBeat = audioData.audioAnalysis.beats.find(
          (beat) => beat.start > progress,
        );
        if (upcomingBeat) {
          const operationTime = performance.now() - startTime; // Time taken for the operation
          const delayUntilNextBeat = Math.max(
            0,
            (upcomingBeat.start - progress) * 1000 - operationTime,
          ); // Calculate delay until the next beat

          setTimeout(() => {
            videoElement.currentTime = 0; // Reset videoElement to start
            videoElement.play(); // Play the videoElement
          }, delayUntilNextBeat);
        } else {
          videoElement.currentTime = 0; // Reset videoElement to start if no upcoming beat
          videoElement.play();
        }
        console.log("[CAT-JAM] Resynchronized to nearest beat");
      } else {
        videoElement.currentTime = 0; // Play the videoElement without delay if no beat information
        videoElement.play();
      }
    } else {
      videoElement.pause(); // Pause the videoElement if Spotify is not playing
    }
  } else {
    console.error("[CAT-JAM] videoElement element not found.");
  }
}

//#region Variables
let _hasBPM = false;
let duration = 0;
//#endregion

//#region Set the current time of the videoElement
const setCurrentTime = () => {
  videoElement.currentTime =
    ((duration || 0) - PlayState.playTime) % videoElement.duration;
};
//#endregion

let lastProgress = 0;

//#region Update CatJam
const updateCatJam = async ({
  type,
  mediaItem,
  playbackState,
}: {
  type: "mediaTransition" | "playbackState" | "load";
  mediaItem?: MediaItem | undefined;
  playbackState?: redux.PlaybackState | undefined;
}) => {
  switch (type) {
    case "mediaTransition": {
      if (mediaItem) {
        const req = await fetch(
          `https://api.vmohammad.dev/lyrics?filter=audioFeatures,audioAnalysis&tidal_id=${mediaItem.id}`,
        );
        if (!req.ok) {
          return;
        }

        audioData = await req.json();
        const startTime = performance.now(); // Record the start time for the operation

        console.log("[CAT-JAM] Audio data fetched:", audioData);

        if (
          audioData &&
          audioData.audioAnalysis &&
          audioData.audioAnalysis.beats &&
          audioData.audioAnalysis.beats.length > 0
        ) {
          const firstBeatStart = audioData.audioAnalysis.beats[0].start; // Get start time of the first beat

          // Adjust video playback rate based on the song's BPM
          videoElement.playbackRate = await getPlaybackRate();

          const operationTime = performance.now() - startTime; // Calculate time taken for operations
          const delayUntilFirstBeat = Math.max(
            0,
            firstBeatStart * 1000 - operationTime,
          ); // Calculate delay until the first beat

          setTimeout(() => {
            videoElement.currentTime = 0; // Ensure video starts from the beginning
            videoElement.play(); // Play the video
          }, delayUntilFirstBeat);
        }
      }
      break;
    }
    case "playbackState": {
      const startTime = performance.now();
      syncTiming(startTime, lastProgress); // Synchronize video timing with the current progress
      break;
    }
    case "load": {
      await updateCatJam({
        type: "mediaTransition",
        mediaItem: await MediaItem.fromPlaybackContext(),
      });
      await updateCatJam({
        type: "playbackState",
        playbackState: PlayState.playing ? "PLAYING" : "PAUSED",
      });
      break;
    }
  }
};
//#endregion

//#region Listeners
MediaItem.onMediaTransition(unloads, async (mediaItem) => {
  return await updateCatJam({
    type: "mediaTransition",
    mediaItem,
    playbackState: "PAUSED",
  });
});

PlayState.onState(unloads, async (playbackState) => {
  return await updateCatJam({ type: "playbackState", playbackState });
});

videoElement.onloadeddata = async () => {
  return await updateCatJam({ type: "load" });
};
//#endregion

ipcRenderer.on(unloads, "client.playback.playersignal", async (data) => {
  const signal = data.signal;
  if (signal !== "media.currenttime") return;
  const currentTime = performance.now();
  const progress = Math.floor(Number(data.time));

  // Check if a significant skip in progress has occurred or if a significant time has passed
  if (Math.abs(progress - lastProgress) >= 2) {
    syncTiming(currentTime, progress); // Synchronize video timing again
  }
  lastProgress = progress; // Update last known progress
});

export default videoElement;
