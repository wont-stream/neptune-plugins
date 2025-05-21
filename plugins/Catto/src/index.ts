import type { LunaUnload } from "@luna/core";
import { redux, MediaItem, PlayState, StyleTag } from "@luna/lib";
import { storage } from "./Settings";

export { Settings } from "./Settings";

export const unloads = new Set<LunaUnload>();

import css from "file://index.css"

{ // Add CSS
	new StyleTag("CatJam", unloads, css).add();
}

let video: HTMLVideoElement = document.createElement("video");
{ // Setup catjam element
	video.src = "https://cdn.jsdelivr.net/gh/wont-stream/neptune-plugins@dev/plugins/Catto/src/catjam.webm";

	video.classList.add("CatJam");
	video.style = `--CatJam-opacity: ${storage.opacity / 100};`;

	video.loop = true;
	video.muted = true;
}

{ // Add catjam element to the player
	const player = document.querySelector("[data-test=\"current-media-imagery\"]");

	if (player) {
		player.append(video);
	}
}

unloads.add(() => video?.remove());

redux.intercept(["playbackControls/MEDIA_PRODUCT_TRANSITION", "playbackControls/SET_PLAYBACK_STATE"], unloads, async () => {
	const mediaItem = await MediaItem.fromPlaybackContext();

	if (!mediaItem) {
		return;
	}

	video.currentTime = ((mediaItem.duration || 0) - PlayState.playTime) % video.duration;

	const bpm = await mediaItem?.bpm()

	if (PlayState.playing) {
		video.play();

		if (bpm) {
			//video.currentTime = 0;
			video.playbackRate = bpm / 135.48;
		} else {
			video.pause();
			video.currentTime = 0;
		}
	} else {
		video.pause();
		//video.currentTime = 0;
	}
});

export default video;