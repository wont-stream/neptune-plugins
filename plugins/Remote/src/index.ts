import type { LunaUnload } from "@luna/core";
import { ipcRenderer, MediaItem, PlayState } from "@luna/lib";
import ReconnectingWebSocket from "reconnecting-websocket";

import { stopWebSocketServer } from "./server.native";

export const unloads = new Set<LunaUnload>();

unloads.add(() => stopWebSocketServer());

const ws = new ReconnectingWebSocket("ws://localhost:20941");

ws.addEventListener("message", (event) => {
	const { op, data } = JSON.parse(event.data);

	if (op === 0) {
		return ws.send(JSON.stringify({ op: 0 }));
	} else if (op === 1) {
		return;
	} else if (op === 2) {
		switch (data.type) {
			case "play":
				PlayState.play();
				break;
			case "pause":
				PlayState.pause();
				break;
			case "next":
				PlayState.next();
				break;
			case "previous":
				PlayState.previous();
				break;
			case "seek":
				// time should be in seconds
				PlayState.seek(data.time);
				break;
			case "repeat":
				// 	Off = 0, Queue = 1, Current Track = 2,
				PlayState.setRepeatMode(data.mode);
				break;
			case "shuffle":
				PlayState.setShuffle(data.shuffle, true);
				break;
			default:
				break;

			// Add more cases as needed
		}
	}

	sendNewDataToClients();
});

unloads.add(() => ws.close());

let realPlayTime = 0;

const sendNewDataToClients = async () => {
	const data = {
		op: 1,
		data: {
			type: "update",
			track: (await MediaItem.fromPlaybackContext())?.tidalItem,
			playState: {
				playing: PlayState.playing,
				playtime: PlayState.playTime,
				repeatMode: PlayState.repeatMode,
				shuffle: PlayState.shuffle,
				realPlayTime,
			},
		},
	};
	ws.send(JSON.stringify(data));
};

MediaItem.onMediaTransition(unloads, sendNewDataToClients);
MediaItem.onPreMediaTransition(unloads, sendNewDataToClients);
MediaItem.onPreload(unloads, sendNewDataToClients);
PlayState.onState(unloads, sendNewDataToClients);

ipcRenderer.on(unloads, "client.playback.playersignal", async (data) => {
	realPlayTime = Number(data.time);
});
