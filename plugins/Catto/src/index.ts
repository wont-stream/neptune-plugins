import type { LunaUnload } from "@luna/core";
import { redux, MediaItem, PlayState } from "@luna/lib";


let element: HTMLVideoElement = document.createElement("video");

element.src = "https://github.com/BlafKing/spicetify-cat-jam-synced/raw/main/src/resources/catjam.webm"
element.style.visibility = "hidden";
element.style.margin = "0 0 0 8px";
element.style.height = "100%";
element.loop = true;
element.muted = true;
element.autoplay = true;

const player = document.getElementById("footerPlayer")

if (player) {
	player.style.gridAutoColumns = "auto";
	player.prepend(element);
}

export const unloads = new Set<LunaUnload>();
unloads.add(() => element?.remove());

// Element doesn't exist until the page is loaded
redux.intercept(["playbackControls/MEDIA_PRODUCT_TRANSITION", "playbackControls/SET_PLAYBACK_STATE"], unloads, async ({ mediaProduct }) => {
	const mediaItem = await MediaItem.fromPlaybackContext();

	if (!mediaItem) {
		element.style.visibility = "hidden";
		return;
	}

	const bpm = await mediaItem?.bpm()

	if (PlayState.playing) {
		element.play();
	} else {
		element.pause();
	}

	if (!bpm) {
		element.style.visibility = "hidden";
	} else {
		element.style.visibility = "visible";

		element.currentTime = 0;
		element.playbackRate = bpm / 135.48;
	}
});