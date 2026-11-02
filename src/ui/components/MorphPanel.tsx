import type { JSX } from "preact";
import { useEffect, useRef } from "preact/hooks";
import type { SceneApi } from "../../scene/sceneApi";
import type { SceneState } from "../../scene/sceneState";

interface Props {
    api: SceneApi;
    state: SceneState;
}

/**
 * Part / outfit switch dropdown (MMD material morphs).
 *
 * Many MMD models ship "全部件" variants where individual pieces (skirt, socks,
 * shoes, P2/P3 accessory sets, ...) are exposed as material morphs. The panel lists
 * those morphs and toggles each between 0 and 1 — the same switch the author
 * provides in MMD ("表示切替").
 */
export function MorphPanel({ api, state }: Props): JSX.Element | null {
    const panelRef = useRef<HTMLDivElement>(null);

    // Close on outside click; clicks on the toolbar button itself are ignored so its
    // own onClick toggles cleanly instead of close-then-reopen.
    useEffect((): (() => void) | void => {
        if (!state.morphPanelOpen) return;
        const onPointerDown = (e: PointerEvent): void => {
            const target = e.target as HTMLElement | null;
            if (!target) return;
            if (panelRef.current && panelRef.current.contains(target)) return;
            if (target.closest("[data-morph-toggle]")) return;
            api.closeMorphPanel();
        };
        document.addEventListener("pointerdown", onPointerDown, true);
        return (): void => document.removeEventListener("pointerdown", onPointerDown, true);
    }, [state.morphPanelOpen, api]);

    if (!state.morphPanelOpen || state.morphList.length === 0) return null;

    return (
        <div
            ref={panelRef}
            class="pointer-events-auto absolute bg-[rgb(44,48,50)] text-white rounded-lg overflow-y-auto shadow-lg
                   w-[250px] max-h-[320px] text-sm"
            style={{ left: "70px", top: "260px" }}
        >
            <div class="sticky top-0 bg-[rgb(44,48,50)] px-3 py-2 text-xs opacity-70 border-b border-white/10">
                部件 / 配件（点击切换）
            </div>
            {state.morphList.map((m): JSX.Element => (
                <button
                    key={m.name}
                    class="flex w-full items-center justify-between gap-2 px-3 py-2 text-left hover:bg-[rgb(64,68,70)]"
                    onClick={(): void => api.setMorphWeight(m.name, m.weight > 0 ? 0 : 1)}
                >
                    <span class="truncate">{m.name}</span>
                    <span
                        class={`shrink-0 rounded px-2 py-0.5 text-xs ${m.weight > 0 ? "bg-[rgb(90,140,90)]" : "bg-white/10 opacity-60"}`}
                    >
                        {m.weight > 0 ? "ON" : "OFF"}
                    </span>
                </button>
            ))}
            <div class="sticky bottom-0 bg-[rgb(44,48,50)] px-3 py-2 border-t border-white/10">
                <button
                    class="w-full rounded px-2 py-1 text-xs bg-white/10 hover:bg-white/20"
                    onClick={(): void => api.resetMorphs()}
                >
                    全部关闭（恢复默认）
                </button>
            </div>
        </div>
    );
}
