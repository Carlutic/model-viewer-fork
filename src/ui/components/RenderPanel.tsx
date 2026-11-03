import type { JSX } from "preact";
import { useEffect, useRef } from "preact/hooks";
import type { SceneApi } from "../../scene/sceneApi";
import type { RenderPreset, SceneState } from "../../scene/sceneState";

interface Props {
    api: SceneApi;
    state: SceneState;
}

const PRESETS: { key: RenderPreset; label: string; desc: string }[] = [
    { key: "default", label: "默认渲染", desc: "原有光照 + 轻后期（与之前一致）" },
    { key: "endfield", label: "终末地风格", desc: "冷蓝阴影 + 暖色主光 + 双色轮廓光，ACES 调色 / 泛光 / 胶片颗粒" },
    { key: "cinematic", label: "电影感", desc: "暖调、暗角、轻泛光，柔和对比" },
    { key: "off", label: "关闭渲染", desc: "关闭后期和附加灯光，平面渲染" }
];

export function RenderPanel({ api, state }: Props): JSX.Element | null {
    const panelRef = useRef<HTMLDivElement>(null);

    useEffect((): (() => void) | void => {
        if (!state.isRenderPanelOpen) return;
        const onPointerDown = (e: PointerEvent): void => {
            const target = e.target as HTMLElement | null;
            if (!target) return;
            if (panelRef.current && panelRef.current.contains(target)) return;
            if (target.closest("[data-render-toggle]")) return;
            api.closeRenderPanel();
        };
        document.addEventListener("pointerdown", onPointerDown, true);
        return (): void => document.removeEventListener("pointerdown", onPointerDown, true);
    }, [state.isRenderPanelOpen, api]);

    if (!state.isRenderPanelOpen) return null;

    const enabled = state.renderPreset !== "off";

    return (
        <div
            ref={panelRef}
            class="pointer-events-auto absolute bg-[rgb(44,48,50)] text-white rounded-lg overflow-y-auto shadow-lg
                   w-[260px] max-h-[420px] text-sm sm:w-[290px] sm:text-base"
            style={{ left: "120px", top: "260px" }}
        >
            <div class="px-3 py-2 text-base font-semibold tracking-wide border-b border-white/10">渲染设置</div>

            {/* Global on/off switch */}
            <button
                class="flex w-full items-center justify-between gap-3 px-3 py-2.5 hover:bg-[rgb(64,68,70)]"
                onClick={(): void => api.setRenderPreset(enabled ? "off" : "default")}
            >
                <span class="text-left">
                    <span class="block">开启渲染</span>
                    <span class="block text-xs text-white/60">{enabled ? "后期与附加灯光已启用" : "当前为平面渲染"}</span>
                </span>
                <span
                    class={`relative inline-block h-5 w-9 shrink-0 rounded-full transition-colors ${enabled ? "bg-emerald-500" : "bg-white/25"}`}
                >
                    <span
                        class={`absolute top-0.5 h-4 w-4 rounded-full bg-white transition-all ${enabled ? "left-[18px]" : "left-0.5"}`}
                    />
                </span>
            </button>

            <div class="px-3 pt-1 pb-1 text-xs text-white/50">渲染预设</div>
            {PRESETS.map((p): JSX.Element => (
                <button
                    key={p.key}
                    class={`block w-full px-3 py-2 text-left hover:bg-[rgb(64,68,70)] ${state.renderPreset === p.key ? "bg-[rgb(64,68,70)]" : ""}`}
                    onClick={(): void => api.setRenderPreset(p.key)}
                >
                    <span class="flex items-center gap-2">
                        <span class={`inline-block h-2 w-2 rounded-full ${state.renderPreset === p.key ? "bg-emerald-400" : "bg-white/25"}`} />
                        <span>{p.label}</span>
                    </span>
                    <span class="mt-0.5 block pl-4 text-xs leading-snug text-white/55">{p.desc}</span>
                </button>
            ))}
        </div>
    );
}
