import baseMotionConfig from "../../res/cam_motion/motion.json";

export interface MotionTrack {
    name: string;
    audioPlayerFile?: string;
    camMotionFile?: string;
    modelMotionFile?: string;
    expressionMotionFile?: string;
    videoFile?: string;
}

/**
 * Built-in tracks (bundled under res/cam_motion) plus tracks fetched at runtime
 * from the motion library repositories, so new dance motions do not need a
 * viewer rebuild. Remote tracks carry absolute URLs.
 */
export const motionTracks: MotionTrack[] = [...(baseMotionConfig as MotionTrack[])];

export async function loadRemoteMotionTracks(bases: string[]): Promise<number> {
    let added = 0;
    for (const base of bases) {
        try {
            const list = await (await fetch(`${base}tracks.json`, { cache: "no-cache" })).json() as Array<Record<string, string>>;
            for (const item of list) {
                if (motionTracks.some(t => t.name === item.name)) continue;
                motionTracks.push({
                    name: item.name,
                    audioPlayerFile: item.audioPlayerFile ? base + item.audioPlayerFile : undefined,
                    camMotionFile: item.camMotionFile ? base + item.camMotionFile : undefined,
                    modelMotionFile: item.modelMotionFile ? base + item.modelMotionFile : undefined,
                    expressionMotionFile: item.expressionMotionFile ? base + item.expressionMotionFile : undefined,
                });
                added += 1;
            }
        } catch (error) {
            console.warn(`Motion library ${base} is unavailable; skipping it:`, error);
        }
    }
    return added;
}
