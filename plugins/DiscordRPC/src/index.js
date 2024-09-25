const unloadables = [];

const formatLongString = (s) => (s.length >= 128 ? `${s.slice(0, 125)}...` : s);

let programaticPause = false;

function getTrackVibrantColor() {
  const sheets = document.styleSheets;

  for (let i = 0; i < sheets.length; i++) {
    try {
      const rules = sheets[i].cssRules;

      for (let j = 0; j < rules.length; j++) {
        const rule = rules[j];

        if (rule.selectorText === ":root") {
          const styles = rule.style;
          const trackVibrantColor = styles.getPropertyValue(
            "--track-vibrant-color"
          );
          if (trackVibrantColor) {
            return trackVibrantColor.trim();
          }
        }
      }
    } catch (e) { }
  }

  return null;
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
      `ws://localhost:${port}/?v=1&client_id=1288341778637918208`
    );

    this.ws.onopen = this.onOpen.bind(this);

    this.ws.onclose = this.onClose.bind(this);

    this.ws.onerror = this.onError.bind(this);
  }

  onOpen() {
    unloadables.push(
      neptune.intercept("playbackControls/TIME_UPDATE", ([current]) => {
        if (programaticPause) return;
        const { item: currentlyPlaying, type: mediaType } =
          neptune.currentMediaItem;

        // TODO: add video support
        if (mediaType !== "track") return;

        const date = new Date();
        const now = (date.getTime() / 1000);
        const remaining = date.setSeconds(
          date.getSeconds() + (currentlyPlaying.duration - current)
        );

        const paused =
          neptune.store.getState().playbackControls.playbackState ===
          "NOT_PLAYING";

        this.ws.readyState === 1 &&
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
                  `by ${currentlyPlaying.artists.map((a) => a.name).join(", ")}`
                ),
                assets: {
                  large_image: `https://resources.tidal.com/images/${currentlyPlaying.album.cover
                    .split("-")
                    .join("/")}/80x80.jpg`,
                  large_text: `on ${formatLongString(
                    currentlyPlaying.album.title
                  )}`,
                  small_text:
                    `${getTrackVibrantColor()}|${neptune.currentMediaItem.item.id}`,
                  ...(paused
                    ? {
                      small_image: "paused-pause",
                    }
                    : {}),
                },
                buttons: [{ label: "Play Song", url: `https://listen.tidal.com/track/${neptune.currentMediaItem.item.id}?u` }],
              },
            },
          });
      })
    );

    programaticPause = true;
    neptune.actions.playbackControls.pause();
    programaticPause = false;
  }

  onClose(event) {
    if (!event.wasClean) {
      return;
    }
  }

  onError() {
    for (const u of unloadables) {
      u();
    }
    try {
      this.ws.close();
    } catch { } // eslint-disable-line no-empty

    setTimeout(() => {
      this.connect();
    }, 250);
  }

  send(data) {
    this.ws.send(JSON.stringify(data));
  }

  close() {
    this.ws.close();
  }
}

const ws = new WebSocketTransport();

ws.connect();

export async function onUnload() {
  for (const u of unloadables) {
    u();
  }

  if (ws) {
    try {
      ws.close();
    } catch { }
  }
}