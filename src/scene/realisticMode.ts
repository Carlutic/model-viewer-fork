import { Camera } from "@babylonjs/core/Cameras/camera";
import { Color4 } from "@babylonjs/core/Maths/math.color";
import { PBRMaterial } from "@babylonjs/core/Materials/PBR/pbrMaterial";
import { RawCubeTexture } from "@babylonjs/core/Materials/Textures/rawCubeTexture";
import { Texture } from "@babylonjs/core/Materials/Textures/texture";
import { DefaultRenderingPipeline } from "@babylonjs/core/PostProcesses/RenderPipeline/Pipelines/defaultRenderingPipeline";
import type { AssetContainer } from "@babylonjs/core/assetContainer";
import type { Mesh } from "@babylonjs/core/Meshes/mesh";
import type { Scene } from "@babylonjs/core/scene";

export interface MaterialMapEntry {
    normal?: string;
    rmo?: string;
}

export interface NormalMapSet {
    base: string;
    maps: Record<string, string | MaterialMapEntry>;
}

let envTexture: RawCubeTexture | null = null;
let pipeline: DefaultRenderingPipeline | null = null;
let pipelineCamera: Camera | null = null;
let normalMapSet: NormalMapSet | null = null;

export function setRealisticNormalMaps(set: NormalMapSet | null): void {
    normalMapSet = set;
}

/** Procedural studio environment: bright sky, soft horizon, dark floor. */
function createStudioEnvironment(scene: Scene): RawCubeTexture {
    const size = 64;
    const faces: Uint8Array[] = [];
    // face order: px, nx, py, ny, pz, nz
    for (let f = 0; f < 6; f++) {
        const data = new Uint8Array(size * size * 4);
        for (let y = 0; y < size; y++) {
            for (let x = 0; x < size; x++) {
                const i = (y * size + x) * 4;
                let r: number, g: number, b: number;
                if (f === 2) {            // top: bright softbox
                    r = 200; g = 205; b = 215;
                } else if (f === 3) {     // bottom: floor bounce
                    r = 35; g = 36; b = 40;
                } else {
                    const t = y / size;
                    r = Math.round(150 - 90 * t);
                    g = Math.round(160 - 95 * t);
                    b = Math.round(180 - 110 * t);
                    // a soft warm light patch on +z / -z
                    if ((f === 4 || f === 5) && t > 0.15 && t < 0.45 && x > size * 0.35 && x < size * 0.65) {
                        r += 60; g += 58; b += 52;
                    }
                }
                data[i] = Math.min(255, r);
                data[i + 1] = Math.min(255, g);
                data[i + 2] = Math.min(255, b);
                data[i + 3] = 255;
            }
        }
        faces.push(data);
    }
    const cube = new RawCubeTexture(scene, faces, size, 1, 3, false, false);
    cube.name = "studioEnvironment";
    cube.level = 1;
    return cube;
}

export function enableRealisticMode(scene: Scene, camera: Camera): void {
    if (!envTexture) envTexture = createStudioEnvironment(scene);
    scene.environmentTexture = envTexture;
    scene.environmentIntensity = 0.35;
    // Strong key light: PBR normal maps only read as detail when a directional
    // light dominates the soft IBL.
    const key = scene.getLightByName("DirectionalLight");
    if (key) key.intensity = 1.85;
    const hemi = scene.getLightByName("HemisphericLight");
    if (hemi) hemi.intensity = 0.16;
    const rim = scene.getLightByName("RimLight");
    if (rim) rim.intensity = 0.8;
    pipelineCamera = camera;
    if (!pipeline) {
        pipeline = new DefaultRenderingPipeline("realisticPipeline", true, scene, [camera]);
        pipeline.fxaaEnabled = true;
        pipeline.bloomEnabled = true;
        pipeline.bloomThreshold = 0.88;
        pipeline.bloomWeight = 0.22;
        pipeline.bloomKernel = 48;
        pipeline.imageProcessing.toneMappingEnabled = true;
        pipeline.imageProcessing.toneMappingType = (scene.getEngine() as unknown as { ACES?: number }).ACES ?? 1;
        pipeline.imageProcessing.exposure = 1.12;
        pipeline.imageProcessing.contrast = 1.10;
        pipeline.imageProcessing.colorCurvesEnabled = true;
        const curves = pipeline.imageProcessing.colorCurves!;
        curves.globalSaturation = 28;
        curves.shadowsSaturation = 14;
        curves.highlightsSaturation = 10;
        curves.shadowsHue = 200;
        curves.highlightsHue = 35;
        pipeline.imageProcessing.vignetteEnabled = true;
        pipeline.imageProcessing.vignetteWeight = 0.35;
        // Depth of field: keeps the character crisp and melts the background away,
        // which is what makes the reference renders look "photographic".
        pipeline.depthOfFieldEnabled = true;
        pipeline.depthOfFieldBlurLevel = 1;
        pipeline.depthOfField.fStop = 2.0;
        pipeline.depthOfField.focalLength = 50;
        pipeline.depthOfField.focusDistance = ((camera as unknown as { radius?: number }).radius ?? 30) * 1000;
        pipeline.imageProcessing.vignetteColor = new Color4(0, 0, 0, 0);
        pipeline.chromaticAberrationEnabled = true;
        pipeline.chromaticAberration.aberrationAmount = 6;
        pipeline.chromaticAberration.radialIntensity = 0.6;
        // light film grain keeps flat PBR walls from looking sterile
        pipeline.grainEnabled = true;
        pipeline.grain.intensity = 6;
        pipeline.grain.animated = true;
    }
    try {
        scene.postProcessRenderPipelineManager.attachCamerasToRenderPipeline(pipeline.name, camera);
    } catch { /* ignore */ }
}

export function disableRealisticMode(scene: Scene): void {
    if (pipeline) {
        try {
            scene.postProcessRenderPipelineManager.detachCamerasFromRenderPipeline(pipeline.name, pipelineCamera ?? undefined as unknown as Camera);
        } catch { /* ignore */ }
    }
    scene.environmentTexture = null;
    scene.environmentIntensity = 1;
    const key = scene.getLightByName("DirectionalLight");
    if (key) key.intensity = 0.8;
    const hemi = scene.getLightByName("HemisphericLight");
    if (hemi) hemi.intensity = 0.4;
    const rim = scene.getLightByName("RimLight");
    if (rim) rim.intensity = 0;
}

const SKIN = /(皮肤|skin|脸|face|头|head)/i;
const HAIR = /(头发|hair|髪|かみ)/i;
const CLOTH = /(衣服|cloth|衣|裙|skirt|jacket|sleeve|silkstock|丝袜|袜|socks|stocking|带|裤)/i;
const METAL = /(金属|金|银|metal|gold|silver|扣|buckle|watch|手表|拉链|zip|button|ボタン|belt|腰带)/i;
const EYE = /(眼睛|eye|瞳|white|眼白|眉|brow)/i;

function resolveEntry(entry: string | MaterialMapEntry | undefined): MaterialMapEntry | null {
    if (!entry) return null;
    return typeof entry === "string" ? { normal: entry } : entry;
}

function setupMaterial(material: PBRMaterial): void {
    const name = material.name ?? "";
    let roughness = 0.85;
    let metallic = 0.0;
    if (METAL.test(name)) { roughness = 0.32; metallic = 0.9; }
    else if (SKIN.test(name)) { roughness = 0.55; }
    else if (EYE.test(name)) { roughness = 0.18; }
    else if (HAIR.test(name)) { roughness = 0.42; metallic = 0.05; }
    else if (CLOTH.test(name)) { roughness = 0.88; }
    material.metallic = metallic;
    material.roughness = roughness;
    material.environmentIntensity = 1.0;

    const albedo = material.albedoTexture;
    if (albedo && albedo.name && normalMapSet) {
        const cleanName = albedo.name.split("?")[0].replace(/\\/g, "/");
        const fileName = decodeURIComponent((cleanName.split("/").pop() ?? ""));
        const entry = resolveEntry(normalMapSet.maps[fileName]);
        if (entry?.normal) {
            const normal = new Texture(normalMapSet.base + entry.normal, material.getScene(), false);
            normal.name = "normal:" + entry.normal;
            normal.gammaSpace = false;   // normal maps are linear data, not sRGB
            normal.level = 1.35;         // slightly exaggerated so the detail reads at viewer distance
            material.bumpTexture = normal;
            material.invertNormalMapY = true;
        }
        if (entry?.rmo) {
            // glTF/Babylon ORM layout: R = ambient occlusion, G = roughness, B = metallic
            const orm = new Texture(normalMapSet.base + entry.rmo, material.getScene(), false);
            orm.name = "orm:" + entry.rmo;
            orm.gammaSpace = false;
            material.metallicTexture = orm;
            material.useAmbientOcclusionFromMetallicTextureRed = true;
            material.useRoughnessFromMetallicTextureGreen = true;
            material.useMetallnessFromMetallicTextureBlue = true;
            material.metallic = 1.0;
            material.roughness = 1.0;
        }
    }
}

/** Convert loaded MMD meshes' PBR materials to a physically-plausible setup. */
export function applyRealisticMaterials(container: unknown): void {
    const meshes = (container as AssetContainer | null | undefined)?.meshes;
    if (!Array.isArray(meshes)) return;
    const seen = new Set<PBRMaterial>();
    for (const mesh of meshes as Mesh[]) {
        const material = mesh.material;
        if (material instanceof PBRMaterial && !seen.has(material)) {
            seen.add(material);
            setupMaterial(material);
        }
    }
}
