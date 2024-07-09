import { store, intercept, currentMediaItem } from "@neptune";
import { getMediaURLFromID } from "@neptune/utils";
import WebSocketTransport from "./ws.js";

const unloadables = [];

const formatLongString = (s) => (s.length >= 128 ? s.slice(0, 125) + "..." : s);

const ws = new WebSocketTransport(() => {});

ws.connect().then(() => {
  unloadables.push(
    intercept("playbackControls/TIME_UPDATE", ([current]) => {
      const state = store.getState();

      const { item: currentlyPlaying, type: mediaType } = currentMediaItem;

      // TODO: add video support
      if (mediaType != "track") return;

      const albumArtURL = getMediaURLFromID(currentlyPlaying.album.cover);

      const date = new Date();
      const now = (date.getTime() / 1000) | 0;
      const remaining = date.setSeconds(
        date.getSeconds() + (currentlyPlaying.duration - current)
      );

      const paused = state.playbackControls.playbackState == "NOT_PLAYING";

      ws.send({
        cmd: "SET_ACTIVITY",
        args: {
          pid: 2094112,
          activity: {
            ...(paused
              ? {
                  smallImageKey: "paused-icon",
                  smallImageText: "Paused",
                }
              : {
                  startTimestamp: now,
                  endTimestamp: remaining,
                }),
            type: 2,
            name: formatLongString(currentlyPlaying.title),
            details: formatLongString(
              "by " + currentlyPlaying.artists.map((a) => a.name).join(", ")
            ),
            largeImageKey: albumArtURL,
            largeImageText: `on ${formatLongString(
              currentlyPlaying.album.title
            )}`,
          },
        },
      });
    })
  );
});

export async function onUnload() {
  unloadables.forEach((u) => u());

  try {
    ws.close();
  } catch {}
}
