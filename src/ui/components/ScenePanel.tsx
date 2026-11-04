import type { JSX } from "preact";
import { useEffect, useRef } from "preact/hooks";
import { scenesBaseUrl } from "../../config";
import type { SceneApi } from "../../scene/sceneApi";
import type { SceneState } from "../../scene/sceneState";

interface Props {
    api: SceneApi;
    state: SceneState;
}

/**
 * Scene switcher. "default" is the built-in hoyo backdrop; the rest are MMD
 * stage models from the Carlutic/scenes library (scenes.json).
 */
export function ScenePanel({ api, state }: Props): JSX.Element | null {
    const panelRef = useRef<HTMLDivElement>(null);

    useEffect((): (() => void) | void => {
        if (!state.isScenePanelOpen) return;
        const onPointerDown = (e: PointerEvent): void => {
            const target = e.target as HTMLElement | null;
            if (!target) return;
            if (panelRef.current && panelRef.current.contains(target)) return;
            if (target.closest("[data-scene-toggle]")) return;
            api.closeScenePanel();
        };
        document.addEventListener("pointerdown", onPointerDown, true);
        return (): void => document.removeEventListener("pointerdown", onPointerDown, true);
    }, [state.isScenePanelOpen, api]);

    if (!state.isScenePanelOpen) return null;

    const options: { key: string; name: string; subtitle?: string; image?: string }[] = [
        { key: "default", name: "默认场景", subtitle: "自带背景" },
        ...state.scenes.map((s) => ({ key: s.key, name: s.name, subtitle: s.subtitle, image: s.image })),
    ];

    return (
        <div
            ref={panelRef}
            class="pointer-events-auto absolute bg-[rgb(44,48,50)] text-white rounded-lg overflow-y-auto shadow-lg
                   w-[240px] max-h-[460px] text-sm sm:w-[270px] sm:text-base"
            style={{ left: "60px", top: "370px" }}
        >
            <div class="px-3 py-2 text-base font-semibold tracking-wide border-b border-white/10">切换场景</div>
            {options.map((o): JSX.Element => (
                <button
                    key={o.key}
                    class={`flex w-full items-center gap-3 px-3 py-2 text-left hover:bg-[rgb(64,68,70)] ${state.currentScene === o.key ? "bg-[rgb(64,68,70)]" : ""}`}
                    onClick={async (): Promise<void> => {
                        await api.setScene(o.key);
                    }}
                >
                    <span class="flex h-12 w-12 shrink-0 items-center justify-center overflow-hidden rounded bg-black/30">
                        {o.image
                            ? <img src={scenesBaseUrl() + o.image} class="h-full w-full object-cover" alt={o.name} />
                            : <span class="text-xs text-white/50">默认</span>}
                    </span>
                    <span class="min-w-0">
                        <span class="block truncate">{o.name}</span>
                        {o.subtitle && <span class="block truncate text-xs text-white/55">{o.subtitle}</span>}
                    </span>
                </button>
            ))}
        </div>
    );
}
