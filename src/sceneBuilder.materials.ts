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
export type MaterialRenderPreset = "default" | "enhanced" | "game" | "endfield" | "realistic" | "anime" | "off";
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
        const r = Math.round((0.26 + (1.0 - 0.26) * s) * 255);
        const g = Math.round((0.33 + (0.98 - 0.33) * s) * 255);
        const b = Math.round((0.58 + (0.95 - 0.58) * s) * 255);
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

/**
 * 少女前线2-style soft three-band toon ramp: cool saturated shadow, neutral mid,
 * warm highlight, each band with a smooth edge. It replaces the model's hard
 * toon texture in "game" mode only; the diffuse colour/saturation are untouched.
 */
let gameToonRamp: Texture | null = null;

function getGameToonRamp(scene: import("@babylonjs/core/scene").Scene): Texture {
    if (gameToonRamp) return gameToonRamp;
    const width = 256;
    const data = new Uint8Array(width * 4);
    const bands: Array<[number, [number, number, number], [number, number, number]]> = [
        [0.0, [0.46, 0.53, 0.72], [0.46, 0.53, 0.72]],   // shadow: cool
        [0.45, [0.72, 0.75, 0.84], [0.82, 0.83, 0.88]],  // mid
        [0.80, [0.98, 0.97, 0.94], [1.0, 1.0, 1.0]],     // light: warm white
    ];
    for (let i = 0; i < width; i++) {
        const t = i / (width - 1);
        // pick the band segment and blend with a smooth edge (0.10 wide)
        let col = bands[0][1];
        for (let b = 0; b < bands.length; b++) {
            const [start, from, to] = bands[b];
            const next = bands[b + 1];
            const end = next ? next[0] : 1.0;
            if (t >= start && t <= end) {
                const k = Math.min(1, Math.max(0, (t - start) / Math.max(1e-4, end - start)));
                const s = k * k * (3 - 2 * k);
                col = [from[0] + (to[0] - from[0]) * s, from[1] + (to[1] - from[1]) * s, from[2] + (to[2] - from[2]) * s];
                break;
            }
        }
        data[i * 4] = Math.round(col[0] * 255);
        data[i * 4 + 1] = Math.round(col[1] * 255);
        data[i * 4 + 2] = Math.round(col[2] * 255);
        data[i * 4 + 3] = 255;
    }
    const tex = new RawTexture(data, width, 1, 5, scene, false, false, Texture.NEAREST_SAMPLINGMODE);
    tex.name = "gameToonRamp";
    tex.wrapU = Texture.CLAMP_ADDRESSMODE;
    tex.onDisposeObservable.add(() => {
        if (gameToonRamp === tex) gameToonRamp = null;
    });
    gameToonRamp = tex;
    return tex;
}

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
        if (w > 0) material.outlineWidth = w * 1.35;
        material.textureMultiplicativeColor = new Color4(1.04, 1.0, 0.99, 1);
        material.specularColor = new Color3(0.26, 0.24, 0.23);
        material.specularPower = 80;
        try {
            material.toonTexture = getAnimeToonRamp(material.getScene());
        } catch { /* ignore */ }
        const mname = material.name ?? "";
        if (SKIN_MAT.test(mname)) {
            // fake subsurface: lift the shadow side with a warm scatter tint
            material.textureAdditiveColor = new Color4(0.030, 0.016, 0.012, 0);
            material.specularColor = new Color3(0.12, 0.10, 0.09);
            material.specularPower = 32;
        } else if (EYE_MAT.test(mname)) {
            material.textureAdditiveColor = new Color4(0.03, 0.03, 0.035, 0);
            material.specularColor = new Color3(0.7, 0.7, 0.72);
            material.specularPower = 160;
        }
    } else if (materialRenderPreset === "game") {
        // Keep the original diffuse colour/saturation and outline; only swap the
        // hard toon ramp for the soft three-band one and lift specular slightly.
        try {
            material.toonTexture = getGameToonRamp(material.getScene());
        } catch { /* ignore */ }
        material.specularColor = new Color3(0.18, 0.17, 0.16);
        material.specularPower = 64;
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
type MaterialMapEntry = string | { normal?: string; rmo?: string; baked?: string };

let activeNormalMapsBase = "";
let activeNormalMaps: Record<string, MaterialMapEntry> = {};

export function setActiveNormalMaps(base: string, maps: Record<string, MaterialMapEntry> | null): void {
    activeNormalMapsBase = base;
    activeNormalMaps = maps ?? {};
}

function applyNormalMap(material: MmdStandardMaterial): void {
    const diffuse = material.diffuseTexture as Texture | null;
    if (!diffuse || !diffuse.name) return;
    const name = decodeURIComponent((diffuse.name.split("?")[0].split("/").pop() ?? ""));
    const raw = activeNormalMaps[name] as MaterialMapEntry | undefined;
    const normalPath = typeof raw === "string" ? raw : raw?.normal;
    if (!normalPath) return;
    try {
        const tex = new Texture(activeNormalMapsBase + normalPath, material.getScene(), false);
        tex.name = "normal:" + normalPath;
        tex.level = 1.8;
        material.bumpTexture = tex;
        material.invertNormalMapY = true;
    } catch { /* ignore */ }
}


// ---------------------------------------------------------------------------
// Stockings material: replicate the Blender "丝袜" shader (Pelica / Endfield).
//
// Blender graph: base = D * P.B, roughness = 1 - P.A, metallic = P.R,
// normal = N, plus a view-dependent Fresnel sheen (IOR 1.5, ramp threshold
// 0.855) and darkening at grazing angles. The viewer's MMD toon material has no
// per-pixel metallic/roughness, so we bake D * P.B into a texture and add the
// Fresnel response as an MMD sphere-map sheen (view dependent) + softer specular.
// Models without a matching `baked` entry in material_maps.json are untouched.
// ---------------------------------------------------------------------------
const STOCKING_MAT = /(丝袜|袜|stocking|socks)/i;

const stockingsSphereMaps = new WeakMap<import("@babylonjs/core/scene").Scene, Texture>();

function getStockingsSphereMap(scene: import("@babylonjs/core/scene").Scene): Texture {
    const cached = stockingsSphereMaps.get(scene);
    if (cached) return cached;
    const size = 256;
    const data = new Uint8Array(size * size * 4);
    for (let y = 0; y < size; y++) {
        for (let x = 0; x < size; x++) {
            const dx = (x + 0.5) / size * 2 - 1;
            const dy = (y + 0.5) / size * 2 - 1;
            const r = Math.min(1, Math.hypot(dx, dy));
            // Fresnel-like rise: flat facing the camera, bright towards grazing.
            const fresnel = Math.pow(r, 3.0);
            const sheen = 0.62 * fresnel;
            const i = (y * size + x) * 4;
            data[i] = Math.round(sheen * 255 * 0.96);
            data[i + 1] = Math.round(sheen * 255 * 0.97);
            data[i + 2] = Math.round(sheen * 255);
            data[i + 3] = 255;
        }
    }
    const tex = RawTexture.CreateRGBATexture(data, size, size, scene, false, false, Texture.BILINEAR_SAMPLINGMODE);
    tex.name = "stockingsSphereMap";
    tex.wrapU = Texture.CLAMP_ADDRESSMODE;
    tex.wrapV = Texture.CLAMP_ADDRESSMODE;
    tex.onDisposeObservable.add(() => {
        if (stockingsSphereMaps.get(scene) === tex) stockingsSphereMaps.delete(scene);
    });
    stockingsSphereMaps.set(scene, tex);
    return tex;
}

function lookupMaterialMap(material: MmdStandardMaterial): MaterialMapEntry | undefined {
    const diffuse = material.diffuseTexture as Texture | null;
    if (!diffuse || !diffuse.name) return undefined;
    const name = decodeURIComponent(diffuse.name.split("?")[0].split("/").pop() ?? "");
    return activeNormalMaps[name];
}

function enhanceStockingsMaterial(material: MmdStandardMaterial): void {
    const name = material.name ?? "";
    const entry = lookupMaterialMap(material);
    const isStocking = STOCKING_MAT.test(name);
    if (!isStocking) return;

    // 1) baked albedo = D * P.B (matches the Blender material's MULTIPLY node).
    if (entry && typeof entry !== "string" && entry.baked && activeNormalMapsBase) {
        const original = material.diffuseTexture as Texture | null;
        const baked = new Texture(
            activeNormalMapsBase + entry.baked,
            material.getScene(),
            false,
            false,
            Texture.TRILINEAR_SAMPLINGMODE,
            () => {
                baked.name = "stockingsBaked:" + entry.baked;
                material.diffuseTexture = baked;
                material.useAlphaFromDiffuseTexture = true;
                baked.hasAlpha = true;
            },
            () => {
                material.diffuseTexture = original;
            }
        );
    }

    // 2) Fresnel sheen as an additive MMD sphere map (view dependent, like Blender).
    try {
        const sphere = getStockingsSphereMap(material.getScene());
        material.sphereTexture = sphere;
        material.sphereTextureBlendMode = 2; // MmdPluginMaterialSphereTextureBlendMode.Add
    } catch { /* ignore */ }

    // 3) Softer, broader specular than the default toon material.
    material.specularColor = new Color3(0.24, 0.235, 0.23);
    material.specularPower = 22;

    // 4) Blender uses HASHED alpha with a 0.5 threshold; the base texture is opaque
    //    for Pelica, so this keeps the material stable without sorting artefacts.
    if (material.transparencyMode === Material.MATERIAL_ALPHABLEND || material.transparencyMode === Material.MATERIAL_ALPHATESTANDBLEND) {
        material.transparencyMode = Material.MATERIAL_ALPHATESTANDBLEND;
        material.alphaCutOff = 0.5;
    }
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
    enhanceStockingsMaterial(material);
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
    applyNormalMap(material);
    enhanceStockingsMaterial(material);
    applyRenderPresetToMaterial(material);
};
