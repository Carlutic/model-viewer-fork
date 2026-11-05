import { Color3 } from "@babylonjs/core/Maths/math.color";
import { DefaultRenderingPipeline } from "@babylonjs/core/PostProcesses/RenderPipeline/Pipelines/defaultRenderingPipeline";
import type { Camera } from "@babylonjs/core/Cameras/camera";
import type { Scene } from "@babylonjs/core/scene";

/**
 * "Default enhanced" mode: the models keep the viewer's original MMD look
 * (same toon ramp, same colours, same outline) - only the lighting and post
 * around them are upgraded and the per-model normal maps are applied.
 *
 * This is the mode to use when the user wants "默认渲染的感觉 + 法线材质 +
 * 更好的光影", without the heavier stylisation of the anime/PBR presets.
 */
let pipeline: DefaultRenderingPipeline | null = null;
let pipelineCamera: Camera | null = null;

export function enableEnhancedMode(scene: Scene, camera: Camera): void {
    pipelineCamera = camera;
    const key = scene.getLightByName("DirectionalLight");
    if (key) {
        key.diffuse = new Color3(1.0, 0.99, 0.97);
        key.intensity = 0.95;
    }
    const rim = scene.getLightByName("RimLight");
    if (rim) {
        rim.intensity = 0.45;
        rim.diffuse = new Color3(0.62, 0.76, 1.0);
    }
    if (!pipeline) {
        pipeline = new DefaultRenderingPipeline("enhancedPipeline", true, scene, [camera]);
        pipeline.fxaaEnabled = true;
        pipeline.bloomEnabled = true;
        pipeline.bloomThreshold = 0.95;
        pipeline.bloomWeight = 0.12;
        pipeline.bloomKernel = 48;
        // keep the original colour response: no ACES, no grading curves
        pipeline.imageProcessing.toneMappingEnabled = false;
        pipeline.imageProcessing.exposure = 1.0;
        pipeline.imageProcessing.contrast = 1.0;
        // very light depth of field so the background reads as depth, not as a wall
        pipeline.depthOfFieldEnabled = true;
        pipeline.depthOfFieldBlurLevel = 1;
        pipeline.depthOfField.fStop = 2.8;
        pipeline.depthOfField.focalLength = 50;
        pipeline.depthOfField.focusDistance = ((camera as unknown as { radius?: number }).radius ?? 30) * 1000;
    }
    try {
        scene.postProcessRenderPipelineManager.attachCamerasToRenderPipeline(pipeline.name, camera);
    } catch { /* ignore */ }
}

export function disableEnhancedMode(scene: Scene): void {
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
    const rim = scene.getLightByName("RimLight");
    if (rim) rim.intensity = 0;
}
