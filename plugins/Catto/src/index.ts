import type { LunaUnload } from "@luna/core";
import { redux, MediaItem } from "@luna/lib";
import { storage } from "./Settings";
export { Settings } from "./Settings";

function onScroll(event: WheelEvent) {
	if (!event.deltaY) return;
	const { playbackControls } = redux.store.getState();
	const changeBy = event.shiftKey ? storage.changeByShift : storage.changeBy;
	const volumeChange = event.deltaY > 0 ? -changeBy : changeBy;
	const newVolume = playbackControls.volume + volumeChange;
	const clampVolume = Math.min(100, Math.max(0, newVolume));
	redux.actions["playbackControls/SET_VOLUME"]({
		volume: clampVolume,
	});
}

let element: HTMLVideoElement = document.createElement("video");

element.src = "https://github.com/BlafKing/spicetify-cat-jam-synced/raw/main/src/resources/catjam.webm"
element.style.visibility = "hidden";
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
redux.intercept("playbackControls/MEDIA_PRODUCT_TRANSITION", unloads, async ({ mediaProduct }) => {
	const mediaItem = await MediaItem.fromPlaybackContext();
	globalThis.mediaItem = mediaItem;

	const bpm = await mediaItem?.bpm()

	if (!bpm) {
		element.style.visibility = "hidden";
	} else {
		console.log(bpm)
		element.style.visibility = "visible";

		element.currentTime = 0;
		element.playbackRate = bpm / 135.48;
	}
});