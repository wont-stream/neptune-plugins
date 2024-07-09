import { store, intercept, currentMediaItem } from "@neptune";
import { getMediaURLFromID } from "@neptune/utils";

const unloadables = [];

const formatLongString = (s) => (s.length >= 128 ? s.slice(0, 125) + "..." : s);

let ws, tries;

const connect = async () => {
  const port = 6463 + (this.tries % 10);

  tries += 1;

  ws = new WebSocket(
    `ws://127.0.0.1:${port}/?v=1&client_id=1130698654987067493`
  );
};

const send = (data) => {
  this.ws.send(JSON.stringify(data));
};

const close = () => {
  return new Promise((r) => {
    this.ws.close();
    r();
  });
};

connect().then(() => {
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

      send({
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
    close();
  } catch {}
}

class WebSocketTransport {
  constructor() {
    this.ws = null;

    this.tries = 0;
  }

  async connect() {
    const port = 6463 + (this.tries % 10);

    this.tries += 1;

    this.ws = new WebSocket(
      `ws://127.0.0.1:${port}/?v=1&client_id=1130698654987067493`
    );

    this.ws.onopen = this.onOpen.bind(this);

    this.ws.onclose = this.onClose.bind(this);

    this.ws.onerror = this.onError.bind(this);

    this.ws.onmessage = this.onMessage.bind(this);
  }

  send(data) {
    this.ws.send(JSON.stringify(data));
  }

  close() {
    return new Promise((r) => {
      this.ws.close();
      r();
    });
  }
}
