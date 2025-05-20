import type { LunaUnload } from "@luna/core";
import { redux, MediaItem, PlayState } from "@luna/lib";
import { storage } from "./Settings";

export { Settings } from "./Settings";

let element: HTMLVideoElement = document.createElement("video");
element.src = "https://cdn.jsdelivr.net/gh/wont-stream/neptune-plugins@dev/plugins/Catto/src/catjam.webm";
element.style.margin = "0 0 0 8px";
element.style.height = "64px";
element.style.position = "relative";
element.style.top = "-63px";
element.style.left = "-8px";
element.style.opacity = (storage.opacity / 100).toString();
element.style.borderRadius = "var(--wave-border-radius--extra-small)";
element.loop = true;
element.muted = true;

const player = document.querySelector("[data-test=\"current-media-imagery\"]");

if (player) {
	player.append(element);
}

export const unloads = new Set<LunaUnload>();
unloads.add(() => element?.remove());

redux.intercept(["playbackControls/MEDIA_PRODUCT_TRANSITION", "playbackControls/SET_PLAYBACK_STATE"], unloads, async ({ mediaProduct }) => {
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
			if (storage.skipNoBPM) PlayState.next();
		}
	} else {
		element.pause();
		//element.currentTime = 0;
	}
});

export default element;