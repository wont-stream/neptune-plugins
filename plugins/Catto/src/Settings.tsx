import React from "react";

import { LunaNumberSetting } from "@luna/ui";

import { ReactiveStore } from "@luna/core";

export const storage = await ReactiveStore.getPluginStorage("CatJam", {
    opacity: 80
});

import element from ".";

export const Settings = () => {
    const [opacity, setOpacity] = React.useState(storage.opacity);

    const onChange = React.useCallback((value: number) => {
        element.style.opacity = `${value / 100}`;
        setOpacity((storage.opacity = value));
    }, []);

    return (
        <>
            <LunaNumberSetting title="CatJam Opacity" desc="Adjust the opacity of the CatJam buddy" min={0} max={100} step={1} value={opacity} onNumber={onChange} />
        </>
    );
};