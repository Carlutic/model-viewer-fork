import { Color3 } from "@babylonjs/core/Maths/math.color";
import { DefaultRenderingPipeline } from "@babylonjs/core/PostProcesses/RenderPipeline/Pipelines/defaultRenderingPipeline";
import type { Camera } from "@babylonjs/core/Cameras/camera";
import type { Scene } from "@babylonjs/core/scene";

/**
 * "Game look" (游戏还原): a fresh NPR setup modelled after the 少女前线2 in-game
 * pipeline (toon ramp + rim light + coloured shadows + soft post).
 *
 * Independent from the other presets: it does NOT reuse the failed "enhanced"
 * preset, and it does not touch the default renderer.
 *
 * - material side (see sceneBuilder.materials.ts "game" branch):
 *     soft three-band toon ramp, original diffuse colours kept, light specular
 * - light side:
 *     neutral key light, cool ambient/ground colour (cool shadow sides),
 *     cool rim light, small warm fill
 * - post:
 *     light bloom, light DOF, mild contrast/saturation only (no hue shift)
 */
let pipeline: DefaultRenderingPipeline | null = null;
let pipelineCamera: Camera | null = null;

export function enableGameMode(scene: Scene, camera: Camera): void {
    pipelineCamera = camera;
    const key = scene.getLightByName("DirectionalLight");
    if (key) {
        key.diffuse = new Color3(1.0, 0.99, 0.96);
        key.intensity = 1.0;
    }
    const hemi = scene.getLightByName("HemisphericLight");
    if (hemi) {
        hemi.intensity = 0.28;
        (hemi as unknown as { groundColor: Color3 }).groundColor = new Color3(0.22, 0.27, 0.38);
    }
    const rim = scene.getLightByName("RimLight");
    if (rim) {
        rim.intensity = 0.55;
        rim.diffuse = new Color3(0.55, 0.72, 1.0);
    }
    if (!pipeline) {
        pipeline = new DefaultRenderingPipeline("gamePipeline", true, scene, [camera]);
        pipeline.fxaaEnabled = true;
        pipeline.bloomEnabled = true;
        pipeline.bloomThreshold = 0.95;
        pipeline.bloomWeight = 0.12;
        pipeline.bloomKernel = 48;
        pipeline.depthOfFieldEnabled = true;
        pipeline.depthOfFieldBlurLevel = 1;
        pipeline.depthOfField.fStop = 2.8;
        pipeline.depthOfField.focalLength = 50;
        pipeline.depthOfField.focusDistance = ((camera as unknown as { radius?: number }).radius ?? 30) * 1000;
        pipeline.imageProcessing.toneMappingEnabled = false;
        pipeline.imageProcessing.exposure = 1.0;
        pipeline.imageProcessing.contrast = 1.03;
        pipeline.imageProcessing.colorCurvesEnabled = true;
        const curves = pipeline.imageProcessing.colorCurves!;
        curves.globalSaturation = 6;
        curves.shadowsSaturation = 0;
        curves.highlightsSaturation = 0;
        pipeline.imageProcessing.vignetteEnabled = true;
        pipeline.imageProcessing.vignetteWeight = 0.2;
    }
    try {
        scene.postProcessRenderPipelineManager.attachCamerasToRenderPipeline(pipeline.name, camera);
    } catch { /* ignore */ }
}

export function disableGameMode(scene: Scene): void {
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
        (hemi as unknown as { groundColor: Color3 }).groundColor = new Color3(1, 1, 1);
    }
    const rim = scene.getLightByName("RimLight");
    if (rim) rim.intensity = 0;
}
