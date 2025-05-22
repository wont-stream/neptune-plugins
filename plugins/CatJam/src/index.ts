import type { LunaUnload } from "@luna/core";
import { redux, MediaItem, PlayState, StyleTag } from "@luna/lib";
import { storage } from "./Settings";

export { Settings } from "./Settings";

export const unloads = new Set<LunaUnload>();

import css from "file://index.css"

//#region CSS
new StyleTag("CatJam", unloads, css).add();
//#endregion



//#region CatJam Video Element
let video: HTMLVideoElement = document.createElement("video");

video.src = "https://cdn.jsdelivr.net/gh/wont-stream/neptune-plugins@dev/plugins/Catto/src/catjam.webm";

video.classList.add("CatJam");
video.style = `--catjam-opacity: ${storage.opacity / 100};`;

video.loop = true;
video.muted = true;
//#endregion

//#region Append CatJam to the media imagery
const appendCatJam = () => {
	const smallAlbumArt = document.querySelector("[data-test=\"current-media-imagery\"]");
	if (smallAlbumArt) return smallAlbumArt.append(video);

	return setTimeout(appendCatJam, 1)
}
appendCatJam();
//#endregion

//#region Add CatJam to unloads
unloads.add(() => video?.remove());
//#endregion

//#region Variables
let hasBPM = false;
let duration = 0;
//#endregion

//#region Set the current time of the video
const setCurrentTime = () => {
	return video.currentTime = ((duration || 0) - PlayState.playTime) % video.duration;
}
//#endregion

//#region Update CatJam
const updateCatJam = async ({ type, mediaItem, playbackState }: { type: "mediaTransition" | "playbackState" | "load", mediaItem?: MediaItem | undefined, playbackState?: redux.PlaybackState | undefined }) => {
	switch (type) {
		case "mediaTransition": {
			if (mediaItem) {
				const bpm = await mediaItem?.bpm();

				duration = mediaItem?.duration || 0;
				setCurrentTime();

				if (bpm) {
					hasBPM = true;
					video.playbackRate = bpm / 135.48;
				} else {
					hasBPM = false;
					video.pause();
					video.currentTime = 0;
				}
			}
			break;
		}
		case "playbackState": {
			switch (playbackState) {
				case "PLAYING": {
					if (hasBPM) {
						setCurrentTime();
						video.play();
					} else {
						video.pause();
					}
					break;
				}
				default: {
					video.pause();
					break;
				}
			}
			break;
		}
		case "load": {
			await updateCatJam({ type: "mediaTransition", mediaItem: await MediaItem.fromPlaybackContext() });
			await updateCatJam({ type: "playbackState", playbackState: PlayState.playing ? "PLAYING" : "PAUSED" });
			break;
		}
	}
}
//#endregion

//#region Listeners
MediaItem.onMediaTransition(unloads, async (mediaItem) => {
	return await updateCatJam({ type: "mediaTransition", mediaItem, playbackState: "PAUSED" });
})

PlayState.onState(unloads, async (playbackState) => {
	return await updateCatJam({ type: "playbackState", playbackState });
})

video.onloadeddata = async () => {
	return await updateCatJam({ type: "load" });
}
//#endregion

export default video;