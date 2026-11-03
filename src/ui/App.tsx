import type { JSX } from "preact";
import { useEffect } from "preact/hooks";
import type { SceneApi } from "../scene/sceneApi";
import { CharacterPanel } from "./components/CharacterPanel";
import { CharNameOverlay } from "./components/CharNameOverlay";
import { DisclaimerText } from "./components/DisclaimerText";
import { MorphPanel } from "./components/MorphPanel";
import { RenderPanel } from "./components/RenderPanel";
import { Toolbar } from "./components/Toolbar";
import { TrackPanel } from "./components/TrackPanel";
import { useSceneState } from "./hooks/useSceneState";

export function App({ api }: { api: SceneApi }): JSX.Element {
    const state = useSceneState(api);

    // Toggle the `.playing` class on the #app root so `.fadeable` children
    // fade out (index.css). Skip fading while the character panel is open.
    useEffect((): void => {
        const el = document.getElementById("app");
        if (!el) return;
        if (state.isPlaying && !state.isCharPanelOpen) {
            el.classList.add("playing");
        } else {
            el.classList.remove("playing");
        }
    }, [state.isPlaying, state.isCharPanelOpen]);

    return (
        <>
            <CharNameOverlay
                name={state.chosenCharDisplay || state.chosenCharName}
                secondName={state.secondCharDisplay || state.secondCharName}
                darkMode={state.darkMode}
            />
            <DisclaimerText darkMode={state.darkMode} />
            <Toolbar api={api} state={state} />
            <MorphPanel api={api} state={state} />
            <TrackPanel api={api} open={state.isTrackPanelOpen} />
            <RenderPanel api={api} state={state} />
            <CharacterPanel api={api} state={state} />
        </>
    );
}