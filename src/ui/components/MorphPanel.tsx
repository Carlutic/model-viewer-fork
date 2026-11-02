import type { JSX } from "preact";
import { useEffect, useMemo, useRef, useState } from "preact/hooks";
import type { SceneApi } from "../../scene/sceneApi";
import type { MorphItem, SceneState } from "../../scene/sceneState";

interface Props {
    api: SceneApi;
    state: SceneState;
}

/**
 * Morph panel: author-provided "表示切替" switches.
 *
 * - material morphs (type 8): part/outfit switches such as P1/P2/P3 sets, skirt,
 *   shoes, earphones → rendered as ON/OFF toggles
 * - vertex morphs (type 1): facial expressions → rendered as 0..1 sliders
 * - bone morphs (type 2): pose helpers baked by the author → 0..1 sliders
 */
export function MorphPanel({ api, state }: Props): JSX.Element | null {
    const panelRef = useRef<HTMLDivElement>(null);
    const [tab, setTab] = useState<"material" | "vertex" | "bone">("material");

    const groups = useMemo(() => ({
        material: state.morphList.filter((m): boolean => m.type === 8),
        vertex: state.morphList.filter((m): boolean => m.type === 1),
        bone: state.morphList.filter((m): boolean => m.type === 2)
    }), [state.morphList]);

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

    // Fall back to whichever tab actually has morphs (models without expressions etc.).
    const activeTab: "material" | "vertex" | "bone" =
        groups[tab].length > 0 ? tab :
            groups.material.length > 0 ? "material" :
                groups.vertex.length > 0 ? "vertex" : "bone";
    const items = groups[activeTab];
    const TABS: { key: "material" | "vertex" | "bone"; label: string }[] = [
        { key: "material", label: "部件" },
        { key: "vertex", label: "表情" },
        { key: "bone", label: "骨骼" }
    ];

    return (
        <div
            ref={panelRef}
            class="pointer-events-auto absolute bg-[rgb(44,48,50)] text-white rounded-lg overflow-hidden shadow-lg
                   w-[300px] max-w-[92vw] text-sm"
            style={{ left: "70px", top: "260px" }}
        >
            <div class="flex items-center gap-1 px-2 pt-2 pb-1 border-b border-white/10">
                {TABS.filter((t): boolean => groups[t.key].length > 0).map((t): JSX.Element => (
                    <button
                        key={t.key}
                        class={`rounded px-2 py-1 text-xs ${activeTab === t.key ? "bg-white/20" : "bg-transparent opacity-60 hover:opacity-100"}`}
                        onClick={(): void => setTab(t.key)}
                    >
                        {t.label} ({groups[t.key].length})
                    </button>
                ))}
            </div>
            <div class="max-h-[340px] overflow-y-auto">
                {items.map((m: MorphItem): JSX.Element => (
                    activeTab === "material" ? (
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
                    ) : (
                        <label key={m.name} class="flex items-center gap-2 px-3 py-1.5 hover:bg-[rgb(64,68,70)]">
                            <span class="w-[110px] shrink-0 truncate text-xs">{m.name}</span>
                            <input
                                type="range"
                                min="0"
                                max="1"
                                step="0.05"
                                value={String(m.weight)}
                                class="h-1 flex-1 cursor-pointer accent-[rgb(120,170,120)]"
                                onInput={(e): void => api.setMorphWeight(m.name, Number((e.target as HTMLInputElement).value))}
                            />
                            <span class="w-10 shrink-0 text-right text-[11px] tabular-nums opacity-70">
                                {m.weight.toFixed(2)}
                            </span>
                        </label>
                    )
                ))}
            </div>
            <div class="px-3 py-2 border-t border-white/10">
                <button
                    class="w-full rounded px-2 py-1 text-xs bg-white/10 hover:bg-white/20"
                    onClick={(): void => api.resetMorphs()}
                >
                    全部重置（恢复默认）
                </button>
            </div>
        </div>
    );
}
