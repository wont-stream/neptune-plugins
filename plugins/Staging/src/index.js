if (location.href.includes("desktop.tidal.com")) {
	location.href = location.href.replace(
		"desktop.tidal.com",
		"desktop.stage.tidal.com",
	);
}

export async function onUnload() {
	if (location.href.includes("desktop.stage.tidal.com")) {
		location.href = location.href.replace(
			"desktop.stage.tidal.com",
			"desktop.tidal.com",
		);
	}
}
