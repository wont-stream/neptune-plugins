import type { LunaUnload } from "@luna/core";
import { redux, MediaItem, PlayState, StyleTag } from "@luna/lib";
import { storage } from "./Settings";

export { Settings } from "./Settings";

export const unloads = new Set<LunaUnload>();

import css from "file://index.css"

{ // Add CSS
	new StyleTag("CatJam", unloads, css).add();
}

let element: HTMLVideoElement = document.createElement("video");
{ // Setup catjam element
	element.src = "https://cdn.jsdelivr.net/gh/wont-stream/neptune-plugins@dev/plugins/Catto/src/catjam.webm";

	element.classList.add("CatJam");
	element.style = `--catjam-opacity: ${storage.opacity / 100};`;

	element.loop = true;
	element.muted = true;
}

{ // Add catjam element to the player
	const player = document.querySelector("[data-test=\"current-media-imagery\"]");

	if (player) {
		player.append(element);
	}
}

unloads.add(() => element?.remove());

redux.intercept(["playbackControls/MEDIA_PRODUCT_TRANSITION", "playbackControls/SET_PLAYBACK_STATE"], unloads, async () => {
	const mediaItem = await MediaItem.fromPlaybackContext();

	if (!mediaItem) {
		return;
	}

	element.currentTime = ((mediaItem.duration || 0) - PlayState.playTime) % element.duration;

	const bpm = await mediaItem?.bpm()

	if (PlayState.playing) {
		element.play();

		if (bpm) {
			//element.currentTime = 0;
			element.playbackRate = bpm / 135.48;
		} else {
			element.pause();
			element.currentTime = 0;
		}
	} else {
		element.pause();
		//element.currentTime = 0;
	}
});

export default element;