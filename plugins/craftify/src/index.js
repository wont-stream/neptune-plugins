const http = require("http");

const server = http.createServer((req, res) => {
  req.setEncoding("utf-8");

  const path = new URL(req.url);

  if (path == "/play") {
    neptune.actions.playbackControls.play();
  } else if (path == "/pause") {
    neptune.actions.playbackControls.pause();
  } else if (path == "/playpause") {
    neptune.actions.playbackControls.togglePlayback();
  } else if (path == "/next") {
    neptune.actions.playbackControls.skipNext();
  } else if (path == "/previous") {
    neptune.actions.playbackControls.skipPrevious();
  }

  //todo

  res.statusCode(200);
});

server.listen(47836);

export const onUnload = () => {
  try {
    server.stop();
  } catch {}
};
