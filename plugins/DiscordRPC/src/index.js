const unloadables = [];

const formatLongString = (s) => (s.length >= 128 ? s.slice(0, 125) + "..." : s);

let programaticPause = false;

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

    this._once = [];
  }

  emit(evt, data) {
    this._once.forEach((data) => {
      if (data.evt == evt) return data.cb(data);
    });
  }

  once(evt, cb) {
    this._once.push({ evt, cb });
  }

  onOpen() {
    unloadables.push(
      neptune.intercept("playbackControls/TIME_UPDATE", ([current]) => {
        if (programaticPause) return;
        const { item: currentlyPlaying, type: mediaType } =
          neptune.currentMediaItem;

        // TODO: add video support
        if (mediaType != "track") return;

        const date = new Date();
        const now = (date.getTime() / 1000) | 0;
        const remaining = date.setSeconds(
          date.getSeconds() + (currentlyPlaying.duration - current)
        );

        const paused =
          neptune.store.getState().playbackControls.playbackState ==
          "NOT_PLAYING";

        this.ws.readyState == 1 &&
          this.send({
            cmd: "SET_ACTIVITY",
            args: {
              pid: 2094112,
              activity: {
                timestamps: {
                  ...(paused
                    ? {}
                    : {
                        start: now,
                        end: remaining,
                      }),
                },
                type: 2,
                name: formatLongString(currentlyPlaying.title),
                details: formatLongString(
                  "by " + currentlyPlaying.artists.map((a) => a.name).join(", ")
                ),
                assets: {
                  large_image: `https://resources.tidal.com/images/${currentlyPlaying.album.cover
                    .split("-")
                    .join("/")}/80x80.jpg`,
                  large_text: `on ${formatLongString(
                    currentlyPlaying.album.title
                  )}`,
                  ...(paused
                    ? {
                        small_image: "paused-icon",
                        small_text: "Paused",
                      }
                    : {}),
                },
              },
            },
          });
      })
    );

    // get the RPC working.
    programaticPause = true;
    neptune.actions.playbackControls.pause();
    neptune.actions.playbackControls.play();
    programaticPause = false;
  }

  onClose(event) {
    if (!event.wasClean) {
      return;
    }

    this.emit("close", event);
  }

  onError() {
    unloadables.forEach((u) => u());
    try {
      this.ws.close();
    } catch {} // eslint-disable-line no-empty

    setTimeout(() => {
      this.connect();
    }, 250);
  }

  send(data) {
    this.ws.send(JSON.stringify(data));
  }

  close() {
    return new Promise((r) => {
      this.once("close", r);

      this.ws.close();
    });
  }
}

const ws = new WebSocketTransport();

ws.connect();

export async function onUnload() {
  unloadables.forEach((u) => u());

  if (ws) {
    try {
      ws.close();
    } catch {}
  }
}
