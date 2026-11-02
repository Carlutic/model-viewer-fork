import type { MmdStandardMaterial } from "babylon-mmd/esm/Loader/mmdStandardMaterial";
import { Material } from "@babylonjs/core";
import { Color3 } from "@babylonjs/core/Maths/math.color";

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
const EFFECT_MATERIAL = /^(emotions?\(?[^)]*\)?|emotion\d+|表情\d*|effects?\d*|エフェクト\d*)$/i;

function hideEffectMaterial(material: MmdStandardMaterial): void {
    const name = (material.name ?? "").trim();
    if (!EFFECT_MATERIAL.test(name)) return;
    material.alpha = 0;
    material.transparencyMode = Material.MATERIAL_ALPHABLEND;
    material.disableDepthWrite = true;
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
};
