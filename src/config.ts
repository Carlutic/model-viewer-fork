export const baseUrl = "https://phoshco.github.io/";
// export const baseUrl = "http://127.0.0.1:8080/";
/**
 * Resolves a bundled asset path (like "res/assets/menu.png") to a URL that works
 * regardless of the current page's pathname or the site's subpath deployment.
 *
 * - localhost dev: prefix is "/"
 * - LAN IP dev: prefix is "/"
 * - phoshco.github.io (deployed): prefix is "/model-viewer/"
 */
export function resUrl(path: string): string {
    const clean = path.replace(/^\/+/, "");
    if (typeof window === "undefined") return "/" + clean;
    const isGithubPages = window.location.hostname.includes("github.io");
    return (isGithubPages ? "/model-viewer/" : "/") + clean;
}

/**
 * Base path used when writing URL slugs via history.replaceState.
 * Only prepend the "/model-viewer" segment on the github.io deployment.
 */
export function urlBasePath(): string {
    if (typeof window === "undefined") return "";
    return window.location.hostname.includes("github.io") ? "/model-viewer" : "";
}

/**
 * Base URL of the Snowbreak: Containment Zone (尘白禁区) model library.
 *
 * The model files are NOT bundled with this site — they live in the separate
 * `Carlutic/snowbreak` repository and are served by its GitHub Pages site.
 * GitHub Pages sends `Access-Control-Allow-Origin: *`, so the manifest, PMX and
 * textures can be fetched cross-origin by both the dev server and a deployment.
 */
export function snowbreakBaseUrl(): string {
    return "https://carlutic.github.io/snowbreak/";
}

/**
 * Base URL of the Girls' Frontline (少女前线) model library, served from the
 * separate `Carlutic/girl_frontline` repository's GitHub Pages site.
 */
export function girlsFrontlineBaseUrl(): string {
    return "https://carlutic.github.io/girl_frontline/";
}

/**
 * Base URL of the second Girls' Frontline (少女前线) model library.
 *
 * The library outgrew the 1 GB GitHub Pages limit of the first repository, so
 * newer batches live in `Carlutic/girl_frontline2`. Both manifests are merged
 * into the same "Girls' Frontline" tab by the scene builder.
 */
export function girlsFrontline2BaseUrl(): string {
    return "https://carlutic.github.io/girl_frontline2/";
}

/**
 * Base URL of the Arknights (明日方舟) model library, served from the separate
 * `Carlutic/arknights` repository's GitHub Pages site.
 */
export function arknightsBaseUrl(): string {
    return "https://carlutic.github.io/arknights/";
}

/**
 * Base URLs of the Blue Archive (碧蓝档案) model libraries. The full-resolution
 * models are split across two repositories to stay under the Pages size limit.
 */
export function blueArchiveBaseUrls(): string[] {
    return [
        "https://carlutic.github.io/bluearchive/",
        "https://carlutic.github.io/bluearchive2/",
        "https://carlutic.github.io/bluearchive3/",
    ];
}

/**
 * Additional Girls' Frontline libraries (original-resolution batches).
 *
 * The full-resolution models are far too large for one GitHub Pages site, so
 * batch 2 is split across girl_frontline2..5. All manifests are merged into the
 * same "Girls' Frontline" tab by the scene builder.
 */
export function girlsFrontlineLibraryBaseUrls(): string[] {
    return [
        "https://carlutic.github.io/girl_frontline2/",
        "https://carlutic.github.io/girl_frontline3/",
        "https://carlutic.github.io/girl_frontline4/",
        "https://carlutic.github.io/girl_frontline5/",
    ];
}
