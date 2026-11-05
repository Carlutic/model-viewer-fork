import type { BaseCharData, GenshinCharData, HSRCharData, ZZZCharData, WuwaCharData, HNACharData, NTECharData, SnowbreakCharData, GirlsFrontlineCharData, ArknightsCharData, BlueArchiveCharData, IdolmasterCharData, GoodThingsCharData, HbrCharData, OthersCharData } from "../sceneBuilder.types";

export type RenderPreset = "default" | "endfield" | "realistic" | "off";

export type TabMode = "Genshin" | "HSR" | "ZZZ" | "WuWa" | "HNA" | "NTE" | "Snowbreak" | "GirlsFrontline" | "Arknights" | "BlueArchive" | "Idolmaster" | "GoodThings" | "Others" | "HeavenBurnsRed" | "None";

export type SortModeKey = "id" | "name";

export interface CharacterData {
    genshin: GenshinCharData[];
    genshinSkins: GenshinCharData[];
    hsr: HSRCharData[];
    hsrSkins: HSRCharData[];
    zzz: ZZZCharData[];
    zzzSkins: ZZZCharData[];
    wuwa: WuwaCharData[];
    wuwaSkins: WuwaCharData[];
    hna: HNACharData[];
    hnaSkins: HNACharData[];
    nte: NTECharData[];
    nteSkins: NTECharData[];
    snowbreak: SnowbreakCharData[];
    snowbreakSkins: SnowbreakCharData[];
    girlsfrontline: GirlsFrontlineCharData[];
    girlsfrontlineSkins: GirlsFrontlineCharData[];
    arknights: ArknightsCharData[];
    arknightsSkins: ArknightsCharData[];
    bluearchive: BlueArchiveCharData[];
    bluearchiveSkins: BlueArchiveCharData[];
    idolmaster: IdolmasterCharData[];
    idolmasterSkins: IdolmasterCharData[];
    goodthings: GoodThingsCharData[];
    goodthingsSkins: GoodThingsCharData[];
    hbr: HbrCharData[];
    hbrSkins: HbrCharData[];
    others: OthersCharData[];
    othersSkins: OthersCharData[];
    allSkins: BaseCharData[];
}

export interface FilterEntry {
    key: string;
    value: string;
}

/**
 * One material morph (MMD "表示切替"/part toggle) exposed by the current model.
 * The viewer only lists material morphs, since those are what author-authored
 * outfit/part switches use.
 */
export interface MorphItem {
    name: string;
    type: number;
    weight: number;
}

export interface SceneState {
    chosenCharName: string;
    // Display label for the chosen character (falls back to chosenCharName).
    chosenCharDisplay: string;
    chosenCharId: number;
    // Secondary character shown beside the primary ("" when none).
    secondCharName: string;
    secondCharDisplay: string;
    // When true, the next character-panel pick ADDS a second character
    // instead of replacing the primary one.
    secondPickMode: boolean;
    tabMode: TabMode;
    darkMode: boolean;
    charScreenMode: boolean;
    skinMode: boolean;
    hasSkinButton: boolean;
    physicsModeOn: boolean;
    // True while interactive joint-posing mode is active (rotation gizmos shown).
    poseModeOn: boolean;
    // True when the current primary model exposes a skeleton that can be posed.
    // Special/exception models (loaded without a skeleton) and multi-character
    // scenes set this to false so the pose toolbar button is disabled.
    canPose: boolean;
    isPlaying: boolean;
    motionName: string;
    // True when the current motion track supplies a full-screen video background.
    // While active, the dark-mode and char-screen (Paimon) toolbar buttons are disabled.
    videoBgActive: boolean;
    isCharPanelOpen: boolean;
    isTrackPanelOpen: boolean;
    isRenderPanelOpen: boolean;
    isScenePanelOpen: boolean;
    // Active render preset. "off" disables the post-processing renderer entirely.
    renderPreset: RenderPreset;
    scenes: import("../sceneBuilder.types").SceneItem[];
    currentScene: string;
    isCapturing: boolean;
    // per-tab filters
    genshinFilter: FilterEntry[];
    hsrFilter: FilterEntry[];
    zzzFilter: FilterEntry[];
    wuwaFilter: FilterEntry[];
    hnaFilter: FilterEntry[];
    nteFilter: FilterEntry[];
    snowbreakFilter: FilterEntry[];
    girlsfrontlineFilter: FilterEntry[];
    arknightsFilter: FilterEntry[];
    bluearchiveFilter: FilterEntry[];
    idolmasterFilter: FilterEntry[];
    goodthingsFilter: FilterEntry[];
    hbrFilter: FilterEntry[];
    othersFilter: FilterEntry[];
    sortModeAscending: boolean;
    sortModeKey: SortModeKey;
    searchQuery: string;
    charData: CharacterData | null;
    isMobile: boolean;
    // Material morphs (part/outfit switches) of the loaded model, and the toolbar
    // dropdown state for toggling them.
    morphList: MorphItem[];
    morphPanelOpen: boolean;
}

type Listener = (state: SceneState) => void;

export class SceneStateStore {
    private state: SceneState;
    private listeners = new Set<Listener>();

    public constructor(initial: SceneState) {
        this.state = initial;
    }

    public get(): SceneState {
        return this.state;
    }

    public set(patch: Partial<SceneState>): void {
        this.state = { ...this.state, ...patch };
        this.listeners.forEach(l => l(this.state));
    }

    public subscribe(l: Listener): () => void {
        this.listeners.add(l);
        return (): void => {
            this.listeners.delete(l);
        };
    }
}

export function createInitialState(isMobile: boolean): SceneState {
    return {
        chosenCharName: "",
        chosenCharDisplay: "",
        chosenCharId: 0,
        secondCharName: "",
        secondCharDisplay: "",
        secondPickMode: false,
        tabMode: "Genshin",
        darkMode: true,
        charScreenMode: true,
        skinMode: false,
        hasSkinButton: false,
        physicsModeOn: false,
        poseModeOn: false,
        canPose: false,
        isPlaying: false,
        motionName: "",
        videoBgActive: false,
        isCharPanelOpen: false,
        isTrackPanelOpen: false,
        isRenderPanelOpen: false,
        isScenePanelOpen: false,
        renderPreset: "default",
        scenes: [],
        currentScene: "default",
        isCapturing: false,
        genshinFilter: [{ key: "id", value: "1000" }],
        hsrFilter: [{ key: "id", value: "2000" }],
        zzzFilter: [{ key: "id", value: "3000" }],
        wuwaFilter: [{ key: "id", value: "4000" }],
        hnaFilter: [{ key: "id", value: "5000" }],
        nteFilter: [{ key: "id", value: "6000" }],
        // Snowbreak ids are 5 digits (70001+), so the implicit id filter must be the
        // single leading digit — "7000" would only match 70003..70009.
        snowbreakFilter: [{ key: "id", value: "7" }],
        // Girls' Frontline ids are 5 digits (80001+); same single-digit prefix rule.
        girlsfrontlineFilter: [{ key: "id", value: "8" }],
        arknightsFilter: [{ key: "id", value: "9" }],
        bluearchiveFilter: [{ key: "id", value: "10" }],
        idolmasterFilter: [{ key: "id", value: "11" }],
        goodthingsFilter: [{ key: "id", value: "13" }],
        hbrFilter: [{ key: "id", value: "14" }],
        othersFilter: [{ key: "id", value: "12" }],
        sortModeAscending: false,
        sortModeKey: "id",
        searchQuery: "",
        charData: null,
        isMobile,
        morphList: [],
        morphPanelOpen: false
    };
}