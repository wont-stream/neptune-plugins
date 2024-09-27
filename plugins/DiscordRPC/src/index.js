import { intercept } from "@neptune";
import { Tracer } from "./_lib/trace";
import getPlaybackControl from "./_lib/getPlaybackControl";
import { MediaItemCache } from "./_lib/Caches/MediaItemCache";
import "./discord.native";

const trace = Tracer("[DiscordRPC]");
const STR_MAX_LEN = 127;
const formatString = (s) => {
	if (!s) return;
	let formattedString = s;
	if (formattedString.length < 2) formattedString += " ";
	return formattedString.length >= STR_MAX_LEN
		? `${formattedString.slice(0, STR_MAX_LEN - 3)}...`
		: formattedString;
};
const getMediaURL = (id, path = "/1280x1280.jpg") =>
	id && `https://resources.tidal.com/images/${id.split("-").join("/")}${path}`;

let track;
let paused = true;
let time = 0;

const mediaItemCache = new MediaItemCache();


export function update(data) {
	track = data?.track ?? track;
	paused = data?.paused ?? paused;
	time = data?.time ?? time;

	// Clear activity if no track or paused
	if (!track || paused) return setRPC();

	const activity = {};

	// Listening type
	activity.type = 2;

	// Only works with modded RPC servers (arRPC, bunRPC, etc)
	activity.name = formatString(track.title);

	activity.buttons = [
		{
			url: `https://tidal.com/browse/${track.contentType}/${track.id}?u`,
			label: "Play Song",
		},
	];

	// Playback/Time
	if (track.duration !== undefined) {
		activity.startTimestamp = Date.now() - time * 1000;
		activity.endTimestamp = activity.startTimestamp + track.duration * 1000;
	}

	// Album
	if (track.album) {
		activity.largeImageKey = getMediaURL(track.album.cover);
		activity.largeImageText = formatString(track.album.title);
	}

	// Title/Artist
	activity.details = formatString(track.title);
	activity.state =
		formatString(track.artists?.map((a) => a.name).join(", ")) ??
		"Unknown Artist";

	return setRPC(activity);
}

function setRPC(activity) {
	return window.electron.ipcRenderer
		.invoke("DISCORD_SET_ACTIVITY", activity)
		.catch(trace.err.withContext("Failed to set activity"));
}

const unloadTransition = intercept(
	"playbackControls/MEDIA_PRODUCT_TRANSITION",
	([media]) => {
		const mediaProduct = media.mediaProduct;
		mediaItemCache.ensure(mediaProduct.productId)
			.then((track) => {
				if (track) update({ track, time: 0 });
			})
			.catch(trace.err.withContext("Failed to fetch media item"));
	},
);

const unloadTime = intercept("playbackControls/TIME_UPDATE", ([newTime]) => {
	time = newTime;
});

const unloadSeek = intercept("playbackControls/SEEK", ([newTime]) => {
	if (typeof newTime === "number") update({ time: newTime });
});

const unloadPlay = intercept(
	"playbackControls/SET_PLAYBACK_STATE",
	([state]) => {
		if (paused && state === "PLAYING") update({ paused: false });
	},
);

const unloadPause = intercept("playbackControls/PAUSE", () => {
	update({ paused: true });
});

const { playbackContext, playbackState, latestCurrentTime } =
	getPlaybackControl();

update({
	track: await mediaItemCache.ensure(playbackContext?.actualProductId),
	time: latestCurrentTime,
	paused: playbackState !== "PLAYING",
});

export const onUnload = () => {
	unloadTransition();
	unloadTime();
	unloadSeek();
	unloadPlay();
	unloadPause();
	window.electron.ipcRenderer
		.invoke("DISCORD_CLEANUP")
		.catch(trace.msg.err.withContext("Failed to cleanup RPC"));
};
