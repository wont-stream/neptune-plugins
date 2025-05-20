import React from "react";

import { LunaSettings, LunaNumberSetting, LunaSwitchSetting } from "@luna/ui";

import { ReactiveStore } from "@luna/core";

export const storage = await ReactiveStore.getPluginStorage("CatJam", {
    opacity: 80,
    skipNoBPM: false,
});

import element from ".";

export const Settings = () => {
    const [opacity, setOpacity] = React.useState(storage.opacity);
    const [skipNoBPM, setSkipNoBPM] = React.useState(storage.skipNoBPM);

    const onChange = React.useCallback((value: number) => {
        element.style.opacity = `${value / 100}`;
        setOpacity((storage.opacity = value));
    }, []);

    return (
        <LunaSettings>
            <LunaNumberSetting title="CatJam Opacity" desc="Adjust the opacity of the CatJam buddy" min={0} max={100} step={1} value={opacity} onNumber={onChange} />
            <LunaSwitchSetting
                title="Auto Skip"
                desc="Skip a track if no BPM is given."
                tooltip="Enable auto skip"
                checked={skipNoBPM}
                onChange={(_, checked) => {
                    setSkipNoBPM((storage.skipNoBPM = checked));
                }}
            />
        </LunaSettings>
    );
};