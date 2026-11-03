// Shared types extracted from sceneBuilder.ts for readability
export interface BaseCharData {
    id: number;
    name: string;
    weaponType: string;
    element: string;
    gender: string;
    rarity: number;
    directory: string;
    image: string;
    pmx: string;
    // Optional human-readable label (may contain non-ASCII, e.g. Chinese). Used for
    // UI display only — `name` stays ASCII because it drives the URL slug and lookups.
    displayName?: string;
    // Material names to hide for this model (converted models may include oversized
    // effect/accessory meshes that would cover the stage).
    hideMaterials?: string[];
    exception?: boolean;   // when true, load WITHOUT skeleton/morph building
    // Optional per-entry asset root. Entries that live in a separate model library
    // (e.g. the Snowbreak repo) set this to an absolute / root-relative URL; entries
    // from the upstream phoshco.github.io JSONs leave it unset (global baseUrl used).
    base?: string;
}

export interface GenshinCharData extends BaseCharData {
    region: string;
}

export interface HSRCharData extends BaseCharData {}
export interface ZZZCharData extends BaseCharData { region: string }
export interface WuwaCharData extends BaseCharData {}
export interface HNACharData extends BaseCharData {}
export interface NTECharData extends BaseCharData {}
export interface SnowbreakCharData extends BaseCharData {}
export interface GirlsFrontlineCharData extends BaseCharData {}

export interface ArknightsCharData extends BaseCharData {}

export interface BlueArchiveCharData extends BaseCharData {}

export interface IdolmasterCharData extends BaseCharData {}
export interface ExtraCharData extends BaseCharData {}
