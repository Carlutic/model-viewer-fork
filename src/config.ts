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
 * Local dev: the model files live in res/snowbreak/ (gitignored, bundled by the
 * dev server / build like every other res asset), so they resolve through resUrl().
 *
 * Deployed elsewhere: replace this with the external library URL, e.g.
 *   "https://<your-user>.github.io/snowbreak/"
 * If you do that, the character entries loaded from it already carry an absolute
 * `base` field, and cross-origin requests only need GitHub Pages' CORS headers.
 */
export function snowbreakBaseUrl(): string {
    return resUrl("res/snowbreak/");
}
