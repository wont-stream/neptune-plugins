const unloadables = [];

const formatLongString = (s) => (s.length >= 128 ? s.slice(0, 125) + "..." : s);

const ws = new WebSocket(
  `ws://127.0.0.1:6463/?v=1&client_id=1130698654987067493`
);

let int;

ws.onopen = () => {
  unloadables.push(
    neptune.intercept("playbackControls/TIME_UPDATE", ([current]) => {
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

      ws.send(
        JSON.stringify({
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
        })
      );
    })
  );
};

ws.onclose = () => {await neptune.plugins.reloadPlugin(neptune.plugins.getPluginById("https://wont-stream.github.io/neptune-plugins/DiscordRPC"))}

export async function onUnload() {
  unloadables.forEach((u) => u());

  try {
    ws.close();
  } catch {}
}
