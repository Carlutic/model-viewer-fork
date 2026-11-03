import { useMemo } from "preact/hooks";
import miniSearch from "minisearch";
import type { BaseCharData } from "../../sceneBuilder.types";
import type { CharacterData } from "../../scene/sceneState";
import { getFirstDigit, findCharByName } from "../../sceneBuilder.utils";

/**
 * Normalizes a search query while KEEPING non-ASCII characters (Chinese, Japanese…).
 *
 * The slug helper (`normalize`) strips everything except a-z0-9, which is right for
 * URLs but made Chinese searches always empty. Here punctuation is turned into
 * spaces so miniSearch's tokenizer can handle "安卡希雅-时之重奏" as two tokens,
 * and lowercase covers Latin queries as before.
 */
const normalizeQuery = (query: string): string =>
    query
        .toLowerCase()
        .replace(/[^\p{L}\p{N}\s]+/gu, " ")
        .trim();

export function useCharacterSearch(charData: CharacterData | null): (query: string) => BaseCharData[] {
    return useMemo(() => {
        if (!charData) return (): BaseCharData[] => [];
        const all: BaseCharData[] = [
            ...charData.genshin,
            ...charData.hsr,
            ...charData.zzz,
            ...charData.wuwa,
            ...charData.hna,
            ...charData.nte,
            ...charData.snowbreak,
            ...charData.girlsfrontline,
            ...charData.arknights,
            ...charData.bluearchive,
            ...charData.idolmaster,
            ...charData.goodthings,
            ...charData.others
        ];
        const ms = new miniSearch({
            // `displayName` holds the Chinese/pretty name (e.g. "可露凯（无瑕侍礼）"),
            // `name` stays the ASCII key used for routing/lookups.
            fields: ["name", "displayName"],
            storeFields: ["id", "name", "displayName"],
            searchOptions: { fuzzy: 0.2, prefix: true }
        });
        ms.addAll(all.map((c): BaseCharData => c));
        return (query: string): BaseCharData[] => {
            const normalized = normalizeQuery(query);
            if (!normalized) return [];
            const results = ms.search(normalized);
            const out: BaseCharData[] = [];
            for (const r of results) {
                const digit = getFirstDigit(r.id);
                let arr: BaseCharData[];
                if (digit === 1) arr = charData.genshin;
                else if (digit === 2) arr = charData.hsr;
                else if (digit === 3) arr = charData.zzz;
                else if (digit === 4) arr = charData.wuwa;
                else if (digit === 5) arr = charData.hna;
                else if (digit === 7) arr = charData.snowbreak;
                else if (digit === 8) arr = charData.girlsfrontline;
                else if (digit === 9) arr = charData.arknights;
                else if (digit === 10) arr = charData.bluearchive;
                else if (digit === 11) arr = charData.idolmaster;
                else if (digit === 13) arr = charData.goodthings;
                else if (digit === 12) arr = charData.others;
                else arr = charData.nte;
                const c = findCharByName(arr, r.name);
                if (c) out.push(c);
            }
            return out;
        };
    }, [charData]);
}
