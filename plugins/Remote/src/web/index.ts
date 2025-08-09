import ReconnectingWebSocket from "reconnecting-websocket";

type updateData = {
	track: {
		id: number;
		title: string;
		duration: number;
		replayGain: number;
		peak: number;
		allowStreaming: boolean;
		streamReady: boolean;
		payToStream: boolean;
		adSupportedStreamReady: boolean;
		djReady: boolean;
		stemReady: boolean;
		streamStartDate: string;
		premiumStreamingOnly: boolean;
		trackNumber: number;
		volumeNumber: number;
		version: string | null;
		popularity: number;
		copyright: string;
		bpm: number;
		url: string;
		isrc: string;
		editable: boolean;
		explicit: boolean;
		audioQuality: string;
		audioModes: string[];
		mediaMetadata: {
			tags: string[];
		};
		upload: boolean;
		accessType: string;
		spotlighted: boolean;
		artist: {
			id: number;
			name: string;
			handle: string | null;
			type: string;
			picture: string;
		};
		artists: {
			id: number;
			name: string;
			handle: string | null;
			type: string;
			picture: string;
		}[];
		album: {
			id: number;
			title: string;
			cover: string;
			vibrantColor: string;
			videoCover: string | null;
		};
		mixes: {
			TRACK_MIX: string;
		};
		contentType: string;
	};
	playState: {
		playing: boolean;
		playtime: number;
		shuffle: boolean;
		repeatMode: number;
		realPlayTime: number;
	};
};

document.addEventListener("DOMContentLoaded", () => {
	const albumArt = document.getElementById("album-art") as HTMLImageElement;
	const trackTitle = document.getElementById(
		"track-title",
	) as HTMLParagraphElement;
	const trackArtist = document.getElementById(
		"track-artist",
	) as HTMLParagraphElement;
	const progressBar = document.getElementById(
		"progress-bar",
	) as HTMLProgressElement;

	const shuffleButton = document.getElementById("shuffle") as HTMLButtonElement;
	const skipPreviousButton = document.getElementById(
		"skip-previous",
	) as HTMLButtonElement;
	const playButton = document.getElementById("play") as HTMLButtonElement;
	const skipNextButton = document.getElementById(
		"skip-next",
	) as HTMLButtonElement;
	const repeatButton = document.getElementById("repeat") as HTMLButtonElement;

	const playIcon = document.getElementById("play-icon") as HTMLElement;
	const repeatIcon = document.getElementById("repeat-icon") as HTMLElement;

	const snackBar = document.getElementById("snackbar") as HTMLDivElement;
	const snackBarIcon = document.getElementById("snackbar-icon") as HTMLElement;
	const snackBarMessage = document.getElementById(
		"snackbar-message",
	) as HTMLElement;

	const showSnackbar = (type: "info" | "error", message: string) => {
		if (type === "info") {
			snackBar.classList.remove("error");
			snackBarIcon.textContent = "info";
		} else {
			snackBar.classList.add("error");
			snackBarIcon.textContent = "error";
		}
		snackBarMessage.textContent = message;
		snackBar.showPopover();

		setTimeout(() => {
			snackBar.hidePopover();
		}, 5000);
	};

	const ws = new ReconnectingWebSocket(
		`${location.protocol.replace("http", "ws")}//${location.host}`,
	);

	ws.addEventListener("open", () => {
		showSnackbar("info", "WebSocket connection established");
		ws.send(JSON.stringify({ op: 2, data: { type: "request" } }));
	});

	ws.addEventListener("message", (event) => {
		const { op, data } = JSON.parse(event.data);

		if (op === 0) {
			return ws.send(JSON.stringify({ op: 0 }));
		} else if (op === 1) {
			update(data);
			return;
		} else if (op === 2) {
			return;
		}
	});

	ws.addEventListener("error", () => {
		showSnackbar("error", "WebSocket error");
	});

	ws.addEventListener("close", () => {
		showSnackbar("error", "WebSocket connection closed");
	});

	let storedData: updateData;

	const update = async (data: updateData) => {
		storedData = data;

		const cover = data.track.album.cover.replaceAll("-", "/");
		if (
			albumArt.src !== `https://resources.tidal.com/images/${cover}/80x80.jpg`
		) {
			// @ts-ignore ui is from window
			ui("theme", `https://resources.tidal.com/images/${cover}/80x80.jpg`);
			albumArt.src = `https://resources.tidal.com/images/${cover}/80x80.jpg`;
			albumArt.srcset = `https://resources.tidal.com/images/${cover}/80x80.jpg 80w, https://resources.tidal.com/images/${cover}/160x160.jpg 160w, https://resources.tidal.com/images/${cover}/320x320.jpg 320w, https://resources.tidal.com/images/${cover}/640x640.jpg 640w, https://resources.tidal.com/images/${cover}/1280x1280.jpg 1280w`;
		}

		if (trackTitle.textContent !== data.track.title) {
			trackTitle.textContent = data.track.title;
		}
		if (
			trackArtist.textContent !==
			data.track.artists.map((a) => a.name).join(", ")
		) {
			trackArtist.textContent = data.track.artists
				.map((a) => a.name)
				.join(", ");
		}
		if (progressBar.value !== data.playState.realPlayTime) {
			progressBar.value = data.playState.realPlayTime;
		}
		if (progressBar.max !== data.track.duration) {
			progressBar.max = data.track.duration;
		}

		if (data.playState.shuffle && shuffleButton.classList.contains("border")) {
			shuffleButton.classList.remove("border");
		} else if (
			!data.playState.shuffle &&
			!shuffleButton.classList.contains("border")
		) {
			shuffleButton.classList.add("border");
		}

		if (data.playState.playing && playIcon.textContent === "play_arrow") {
			playIcon.textContent = "pause";
		} else if (!data.playState.playing && playIcon.textContent === "pause") {
			playIcon.textContent = "play_arrow";
		}
		// 	Off = 0, Queue = 1, Current Track = 2
		if (
			data.playState.repeatMode === 0 &&
			repeatIcon.textContent !== "repeat"
		) {
			repeatIcon.textContent = "repeat";
			repeatButton.classList.add("border");
		} else if (
			data.playState.repeatMode === 1 &&
			repeatButton.classList.contains("border")
		) {
			repeatIcon.textContent = "repeat";
			repeatButton.classList.remove("border");
		} else if (
			data.playState.repeatMode === 2 &&
			repeatIcon.textContent !== "repeat_one"
		) {
			repeatIcon.textContent = "repeat_one";
			repeatButton.classList.remove("border");
		}

		setTimeout(() => {
			ws.send(JSON.stringify({ op: 2, data: { type: "request" } }));
		}, 1000);
	};

	shuffleButton.onclick = () => {
		ws.send(
			JSON.stringify({
				op: 2,
				data: { type: "shuffle", shuffle: !storedData.playState.shuffle },
			}),
		);
	};

	skipPreviousButton.onclick = () => {
		ws.send(
			JSON.stringify({
				op: 2,
				data: { type: "previous" },
			}),
		);
	};

	playButton.onclick = () => {
		ws.send(
			JSON.stringify({
				op: 2,
				data: { type: storedData.playState.playing ? "pause" : "play" },
			}),
		);
	};

	skipNextButton.onclick = () => {
		ws.send(
			JSON.stringify({
				op: 2,
				data: { type: "next" },
			}),
		);
	};

	repeatButton.onclick = () => {
		ws.send(
			JSON.stringify({
				op: 2,
				data: {
					type: "repeat",
					mode: (storedData.playState.repeatMode + 1) % 3,
				},
			}),
		);
	};

	progressBar.addEventListener("click", (e) => {
		// Get bar dimensions & position
		const rect = progressBar.getBoundingClientRect();

		// Click position relative to bar
		const clickX = e.clientX - rect.left;

		// Fraction clicked
		const fraction = Math.min(Math.max(clickX / rect.width, 0), 1);

		// Map fraction to your max value
		const newValue = fraction * progressBar.max;

		ws.send(
			JSON.stringify({
				op: 2,
				data: { type: "seek", time: newValue },
			}),
		);
	});
});
