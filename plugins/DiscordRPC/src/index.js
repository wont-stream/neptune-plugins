import { store, intercept, currentMediaItem } from "@neptune";
import { getMediaURLFromID } from "@neptune/utils";

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

class WebSocketTransport {
  constructor(cb) {
    this.cb = cb;
    this.ws = null;

    this.tries = 0;
  }

  emit(evt, data) {
    this.cb(evt, data);
  }
  once(evt, data) {
    this.cb(evt, data);
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

  onOpen() {
    this.emit("open");
  }

  onClose(event) {
    if (!event.wasClean) {
      return;
    }

    this.emit("close", event);
  }

  onError(event) {
    try {
      this.ws.close();
    } catch {} // eslint-disable-line no-empty

    if (this.tries > 20) {
      this.emit("error", event.error);
    } else {
      setTimeout(() => {
        this.connect();
      }, 250);
    }
  }

  onMessage(event) {
    this.emit("message", JSON.parse(event.data));
  }

  send(data) {
    this.ws.send(JSON.stringify(data));
  }

  ping() {} // eslint-disable-line no-empty-function

  close() {
    return new Promise((r) => {
      this.once("close", r);

      this.ws.close();
    });
  }
}
