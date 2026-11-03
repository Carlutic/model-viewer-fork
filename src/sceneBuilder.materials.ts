import type { MmdStandardMaterial } from "babylon-mmd/esm/Loader/mmdStandardMaterial";
import { Material } from "@babylonjs/core";
import { Color3, Color4 } from "@babylonjs/core/Maths/math.color";

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
export type MaterialRenderPreset = "default" | "endfield" | "off";
let materialRenderPreset: MaterialRenderPreset = "default";

export const setMaterialRenderPreset = (preset: MaterialRenderPreset): void => {
    materialRenderPreset = preset;
};

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
    } else if (materialRenderPreset === "off") {
        // Flat render: no outline hull, no stylised speculars.
        material.outlineWidth = 0;
        material.specularColor = Color3.Black();
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
