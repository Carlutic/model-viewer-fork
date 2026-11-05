import { Color3 } from "@babylonjs/core/Maths/math.color";
import { Vector3 } from "@babylonjs/core/Maths/math.vector";
import { DirectionalLight } from "@babylonjs/core/Lights/directionalLight";
import { DefaultRenderingPipeline } from "@babylonjs/core/PostProcesses/RenderPipeline/Pipelines/defaultRenderingPipeline";
import type { Camera } from "@babylonjs/core/Cameras/camera";
import type { HemisphericLight } from "@babylonjs/core/Lights/hemisphericLight";
import type { Scene } from "@babylonjs/core/scene";

/**
 * "Anime cinematic" mode: keeps the MMD toon materials (so the model stays
 * vibrant/anime instead of turning into muted PBR) and upgrades the *lighting*
 * and *post* around them:
 *   - warm key light + cool hemispheric fill + strong coloured rim light
 *   - bloom, DOF, ACES tone mapping, saturation/colour-curve grading
 * This is the look used by high-end MMD dance videos.
 */
let pipeline: DefaultRenderingPipeline | null = null;
let pipelineCamera: Camera | null = null;
let fillLight: DirectionalLight | null = null;

export function enableAnimeMode(scene: Scene, camera: Camera): void {
    pipelineCamera = camera;
    const key = scene.getLightByName("DirectionalLight");
    if (key) {
        key.diffuse = new Color3(1.0, 0.985, 0.96);
        key.intensity = 1.0;
    }
    const hemi = scene.getLightByName("HemisphericLight");
    if (hemi) {
        hemi.intensity = 0.22;
        (hemi as HemisphericLight).groundColor = new Color3(0.16, 0.21, 0.34);
    }
    const rim = scene.getLightByName("RimLight");
    if (rim) {
        rim.intensity = 0.9;
        rim.diffuse = new Color3(0.45, 0.65, 1.0);
    }
    if (!fillLight) {
        fillLight = new DirectionalLight("AnimeFill", new Vector3(-0.5, -0.35, -1), scene);
        fillLight.diffuse = new Color3(0.72, 0.80, 1.0);
    }
    fillLight.intensity = 0.16;
    if (!pipeline) {
        pipeline = new DefaultRenderingPipeline("animePipeline", true, scene, [camera]);
        pipeline.fxaaEnabled = true;
        pipeline.bloomEnabled = true;
        pipeline.bloomThreshold = 0.94;
        pipeline.bloomWeight = 0.16;
        pipeline.bloomKernel = 56;
        pipeline.imageProcessing.toneMappingEnabled = true;
        pipeline.imageProcessing.toneMappingType = (scene.getEngine() as unknown as { ACES?: number }).ACES ?? 1;
        pipeline.imageProcessing.exposure = 0.95;
        pipeline.imageProcessing.contrast = 1.14;
        pipeline.imageProcessing.colorCurvesEnabled = true;
        const curves = pipeline.imageProcessing.colorCurves!;
        curves.globalSaturation = 42;
        curves.shadowsHue = 215;
        curves.shadowsSaturation = 18;
        curves.highlightsHue = 45;
        curves.highlightsSaturation = 12;
        pipeline.imageProcessing.vignetteEnabled = true;
        pipeline.imageProcessing.vignetteWeight = 0.3;
        pipeline.depthOfFieldEnabled = true;
        pipeline.depthOfFieldBlurLevel = 1;
        pipeline.depthOfField.fStop = 2.4;
        pipeline.depthOfField.focalLength = 50;
        pipeline.depthOfField.focusDistance = ((camera as unknown as { radius?: number }).radius ?? 30) * 1000;
    }
    try {
        scene.postProcessRenderPipelineManager.attachCamerasToRenderPipeline(pipeline.name, camera);
    } catch { /* ignore */ }
}

export function disableAnimeMode(scene: Scene): void {
    if (pipeline) {
        try {
            scene.postProcessRenderPipelineManager.detachCamerasFromRenderPipeline(
                pipeline.name, pipelineCamera ?? undefined as unknown as Camera);
        } catch { /* ignore */ }
    }
    const key = scene.getLightByName("DirectionalLight");
    if (key) {
        key.diffuse = new Color3(1, 1, 1);
        key.intensity = 0.8;
    }
    const hemi = scene.getLightByName("HemisphericLight");
    if (hemi) {
        hemi.intensity = 0.4;
        (hemi as HemisphericLight).groundColor = new Color3(1, 1, 1);
    }
    const rim = scene.getLightByName("RimLight");
    if (rim) rim.intensity = 0;
    if (fillLight) fillLight.intensity = 0;
}
