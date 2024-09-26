import { store } from "@neptune";
import { interceptPromise } from "../intercept/interceptPromise";
import getPlaybackControl from "../getPlaybackControl";

import { libTrace } from "../trace";

export class MediaItemCache {
	current(playbackContext) {
		const context = playbackContext ?? getPlaybackControl()?.playbackContext;
		if (context?.actualProductId === undefined) return undefined;
		return this.ensure(context.actualProductId);
	}
	async ensureTrack(itemId) {
		const mediaItem = await this.ensure(itemId);
		if (mediaItem?.contentType === "track") return mediaItem;
		return undefined;
	}
	async ensureVideo(itemId) {
		const mediaItem = await this.ensure(itemId);
		if (mediaItem?.contentType === "video") return mediaItem;
		return undefined;
	}
	async ensure(itemId) {
		if (itemId === undefined) return undefined;

		const mediaItem = this._cache[itemId];
		if (mediaItem !== undefined) return mediaItem;

		const mediaItems = store.getState().content.mediaItems;
		for (const itemId in mediaItems) {
			const item = mediaItems[itemId]?.item;
			this._cache[itemId] = item;
		}

		if (this._cache[itemId] === undefined) {
			const currentPage = window.location.pathname;

			const loadedTrack = await interceptPromise(
				() => neptune.actions.router.replace(`/track/${itemId}`),
				["page/IS_DONE_LOADING"],
				[],
			)
				.then(() => true)
				.catch(
					libTrace.warn.withContext(
						`TrackItemCache.ensure failed to load track ${itemId}`,
					),
				);
			// If we fail to load the track, maybe its a video, try that instead as a last ditch attempt
			if (!loadedTrack) {
				await interceptPromise(
					() => neptune.actions.router.replace(`/video/${itemId}`),
					["page/IS_DONE_LOADING"],
					[],
				).catch(
					libTrace.warn.withContext(
						`TrackItemCache.ensure failed to load video ${itemId}`,
					),
				);
			}
			neptune.actions.router.replace(currentPage);

			const mediaItems = store.getState().content.mediaItems;
			const trackItem = mediaItems[+itemId]?.item;
			this._cache[itemId] = trackItem;
		}

		return this._cache[itemId];
	}
}
