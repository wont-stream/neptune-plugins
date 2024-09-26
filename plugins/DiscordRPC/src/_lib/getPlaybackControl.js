import { store } from "@neptune";

export default () => store.getState()?.playbackControls ?? {};
