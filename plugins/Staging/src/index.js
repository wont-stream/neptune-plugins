if (!location.href.includes("desktop.tidal.com")) return;
location.href = location.href.replace(
  "desktop.tidal.com",
  "desktop.stage.tidal.com"
);
