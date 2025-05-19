import type { LunaUnload } from "@luna/core";
import { redux, MediaItem, PlayState } from "@luna/lib";

let element: HTMLVideoElement = document.createElement("video");
element.src = webm;
element.style.margin = "0 0 0 8px";
element.style.height = "64px";
element.style.position = "relative";
element.style.top = "-63px";
element.style.left = "-8px";
element.style.borderRadius = "var(--wave-border-radius--extra-small)";
element.loop = true;
element.muted = true;

const player = document.querySelector("[data-test=\"current-media-imagery\"]");

if (player) {
	player.append(element);
}

export const unloads = new Set<LunaUnload>();
unloads.add(() => element?.remove());

// Element doesn't exist until the page is loaded
redux.intercept(["playbackControls/MEDIA_PRODUCT_TRANSITION", "playbackControls/SET_PLAYBACK_STATE"], unloads, async ({ mediaProduct }) => {
	const mediaItem = await MediaItem.fromPlaybackContext();

	if (!mediaItem) {
		return;
	}

	const bpm = await mediaItem?.bpm()

	if (PlayState.playing) {
		element.play();
	} else {
		element.pause();
		element.currentTime = 0;
	}

	if (bpm) {
		element.currentTime = 0;
		element.playbackRate = bpm / 135.48;
	}
});