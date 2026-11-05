import type { MmdStandardMaterial } from "babylon-mmd/esm/Loader/mmdStandardMaterial";
import { Material } from "@babylonjs/core";
import { Color3, Color4 } from "@babylonjs/core/Maths/math.color";
import { Texture } from "@babylonjs/core/Materials/Textures/texture";
import { RawTexture } from "@babylonjs/core/Materials/Textures/rawTexture";

/**
 * Some MMD authors tint the outline (edge) color of a material — e.g. the Girls'
 * Frontline Clukay model uses a green edge color (0, 0.25, 0) for the hair materials.
 * In MMD's thin hull outline that reads as a subtle shading tint, but in this viewer
 * (larger outline width on thin hair strands) it shows up as an obvious green fringe
 * around the hair.
 *
 * Hair materials with a strongly green-dominant outline are therefore converted to a
 * neutral grey of the same luminance: the outline stays, the colored fringe goes.
 * Everything else (black/brown/red author outlines) is left untouched.
 */
function neutralizeGreenHairOutline(material: MmdStandardMaterial): void {
    const name = material.name ?? "";
    if (!/hair/i.test(name)) return;
    const outline = material.outlineColor;
    if (!outline) return;
    const { r, g, b } = outline;
    const greenDominant = g > r * 1.25 && g > b * 1.25 && g > 0.02;
    if (!greenDominant) return;
    const luminance = 0.299 * r + 0.587 * g + 0.114 * b;
    material.outlineColor = new Color3(luminance, luminance, luminance);
}

/**
 * Girls' Frontline game-extracted models ship "Emotions"/"Emotion1..2"/"表情1..2"
 * materials that draw manga emotion-effect cards (the `extra.png` texture sheet,
 * e.g. a full-screen cyan swirl). They are meant for video-style emphasis, are
 * visible by default in MMD, and look like a giant background in a character viewer.
 * Hide them; the character itself and all outfit/expression switches are unaffected.
 */
const EFFECT_MATERIAL = /^(emotions?\d*(\([^)]*\))?|emotion\d+(\.\d+)?|表情\d*|effects?\d*|エフェクト\d*)$/i;

/**
 * HBR (Heaven Burns Red) rips ship opaque "shape face" meshes (cheek/blush/sweat
 * masks) that are only meant to be revealed by expression morphs. Converted to
 * PMX they sit in front of the eye quads and paint the face white, so hide them.
 */
const FACE_SHAPE_MATERIAL = /face\s*shape|shape_?face/i;

function hideFaceShapeMaterial(material: MmdStandardMaterial): void {
    const name = material.name ?? "";
    if (!FACE_SHAPE_MATERIAL.test(name)) return;
    material.alpha = 0;
    material.transparencyMode = Material.MATERIAL_ALPHABLEND;
    material.disableDepthWrite = true;
}

function hideEffectMaterial(material: MmdStandardMaterial): void {
    const name = (material.name ?? "").trim();
    if (!EFFECT_MATERIAL.test(name)) return;
    material.alpha = 0;
    material.transparencyMode = Material.MATERIAL_ALPHABLEND;
    material.disableDepthWrite = true;
}

// ---------------------------------------------------------------------------
// Render presets applied to the *character materials* (not to the screen).
// The viewer freezes materials for performance, so a preset change rebuilds the
// current model's materials through these hooks.
// ---------------------------------------------------------------------------
export type MaterialRenderPreset = "default" | "endfield" | "realistic" | "anime" | "off";
let materialRenderPreset: MaterialRenderPreset = "default";

export const setMaterialRenderPreset = (preset: MaterialRenderPreset): void => {
    materialRenderPreset = preset;
};

/**
 * Soft two-tone MMD toon ramp: cool saturated shadows fading smoothly into warm
 * highlights. Replacing the model's hard 1-bit toon texture with this is what
 * gives the anime preset its "painted" shading instead of hard bands.
 */
let animeToonRamp: Texture | null = null;

function getAnimeToonRamp(scene: import("@babylonjs/core/scene").Scene): Texture {
    if (animeToonRamp) return animeToonRamp;
    const width = 256;
    const data = new Uint8Array(width * 4);
    for (let i = 0; i < width; i++) {
        const t = i / (width - 1);
        // smoothstep so the shadow band has a soft painted edge
        const s = t * t * (3 - 2 * t);
        const warm = Math.min(1, Math.max(0, (t - 0.45) / 0.55));
        const r = Math.round((0.42 + (1.0 - 0.42) * s) * 255);
        const g = Math.round((0.50 + (0.96 - 0.50) * s) * 255);
        const b = Math.round((0.74 + (0.90 - 0.74) * s) * 255);
        data[i * 4] = Math.min(255, r + Math.round(40 * warm));
        data[i * 4 + 1] = Math.min(255, g + Math.round(30 * warm));
        data[i * 4 + 2] = Math.min(255, b - Math.round(20 * warm));
        data[i * 4 + 3] = 255;
    }
    const tex = new RawTexture(data, width, 1, 5, scene, false, false, Texture.NEAREST_SAMPLINGMODE);
    tex.name = "animeToonRamp";
    tex.wrapU = Texture.CLAMP_ADDRESSMODE;
    // The character rebuild disposes its materials together with their textures, so
    // drop the cache when that happens (otherwise the next preset switch reuses a
    // disposed texture and the model renders black).
    tex.onDisposeObservable.add(() => {
        if (animeToonRamp === tex) animeToonRamp = null;
    });
    animeToonRamp = tex;
    return tex;
}

const SKIN_MAT = /(皮肤|skin|body|脸|face)/i;
const EYE_MAT = /(眼睛|eye|瞳|eyewhite|眼白)/i;

/** Inverse-hull outline thickness: MMD "edge size" scaled up for a cel look. */
function applyRenderPresetToMaterial(material: MmdStandardMaterial): void {
    if (materialRenderPreset === "endfield") {
        // Endfield-ish cel look: thicker dark-blue outline, lifted cool shadows,
        // slightly warm daylit texture, tighter specular highlight.
        const width = material.outlineWidth;
        if (width > 0) material.outlineWidth = width * 2.4;
        material.outlineColor = new Color3(0.015, 0.025, 0.05);
        material.textureMultiplicativeColor = new Color4(1.02, 1.0, 0.97, 1);
        material.textureAdditiveColor = new Color4(0.008, 0.011, 0.016, 0);
        material.specularColor = new Color3(0.12, 0.13, 0.16);
        material.specularPower = 48;
    } else if (materialRenderPreset === "anime") {
        // Anime-cinematic: keep the toon shading, but replace the hard ramp with a
        // soft painted one and give skin/eyes/cloth stylised responses.
        const w = material.outlineWidth;
        if (w > 0) material.outlineWidth = w * 1.2;
        material.textureMultiplicativeColor = new Color4(1.10, 1.03, 0.96, 1);
        material.specularColor = new Color3(0.34, 0.30, 0.27);
        material.specularPower = 80;
        try {
            material.toonTexture = getAnimeToonRamp(material.getScene());
        } catch { /* ignore */ }
        const mname = material.name ?? "";
        if (SKIN_MAT.test(mname)) {
            // fake subsurface: lift the shadow side with a warm scatter tint
            material.textureAdditiveColor = new Color4(0.10, 0.045, 0.025, 0);
            material.specularColor = new Color3(0.12, 0.10, 0.09);
            material.specularPower = 32;
        } else if (EYE_MAT.test(mname)) {
            material.textureAdditiveColor = new Color4(0.03, 0.03, 0.035, 0);
            material.specularColor = new Color3(0.7, 0.7, 0.72);
            material.specularPower = 160;
        }
    } else if (materialRenderPreset === "off") {
        // Flat render: no outline hull, no stylised speculars.
        material.outlineWidth = 0;
        material.specularColor = Color3.Black();
    }
}

/**
 * Optional per-model normal maps. The viewer fetches `material_maps.json` next to
 * the model (mapping a diffuse texture file name to a normal-map path) and the
 * material builder then attaches it as a bump texture. Purely additive: models
 * without the manifest render exactly as before.
 */
let activeNormalMapsBase = "";
let activeNormalMaps: Record<string, string | { normal?: string; rmo?: string }> = {};

export function setActiveNormalMaps(base: string, maps: Record<string, string | { normal?: string; rmo?: string }> | null): void {
    activeNormalMapsBase = base;
    activeNormalMaps = maps ?? {};
}

function applyNormalMap(material: MmdStandardMaterial): void {
    const diffuse = material.diffuseTexture as Texture | null;
    if (!diffuse || !diffuse.name) return;
    const name = decodeURIComponent((diffuse.name.split("?")[0].split("/").pop() ?? ""));
    const raw = activeNormalMaps[name] as string | { normal?: string } | undefined;
    const normalPath = typeof raw === "string" ? raw : raw?.normal;
    if (!normalPath) return;
    try {
        const tex = new Texture(activeNormalMapsBase + normalPath, material.getScene(), false);
        tex.name = "normal:" + normalPath;
        material.bumpTexture = tex;
        material.invertNormalMapY = true;
    } catch { /* ignore */ }
}

// Keep exact logic from original callbacks — exported so SceneBuilder can assign them.
export const afterBuildSingleMaterialDefault = (material: MmdStandardMaterial): void => {
    material.forceDepthWrite = true;
    material.useAlphaFromDiffuseTexture = true;
    const diffuseTexture = material.diffuseTexture;
    if (diffuseTexture) {
        diffuseTexture.hasAlpha = true;
        material.useAlphaFromDiffuseTexture = true;
    }
    if (material.transparencyMode === Material.MATERIAL_ALPHABLEND) {
        material.transparencyMode = Material.MATERIAL_ALPHATESTANDBLEND;
        material.alphaCutOff = 0.01;
    }
    neutralizeGreenHairOutline(material);
    hideEffectMaterial(material);
    hideFaceShapeMaterial(material);
    applyNormalMap(material);
    applyRenderPresetToMaterial(material);
};

export const afterBuildSingleMaterialSt = (material: MmdStandardMaterial): void => {
    material.forceDepthWrite = true;
    const diffuseTexture = material.diffuseTexture;
    material.specularColor = Color3.Black();
    if (diffuseTexture) {
        diffuseTexture.hasAlpha = true;
        material.useAlphaFromDiffuseTexture = true;
    }
    if (material.transparencyMode === Material.MATERIAL_ALPHABLEND) {
        material.transparencyMode = Material.MATERIAL_ALPHATESTANDBLEND;
        material.alphaCutOff = 0.01;
    }
    neutralizeGreenHairOutline(material);
    hideEffectMaterial(material);
    applyRenderPresetToMaterial(material);
};
