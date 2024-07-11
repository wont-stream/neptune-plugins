if (location.href.includes("desktop.tidal.com")) {
  location.href = location.href.replace(
    "desktop.tidal.com",
    "desktop.stage.tidal.com"
  );
}

export async function onUnload() {}
