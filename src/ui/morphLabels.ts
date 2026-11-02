/**
 * Chinese display labels for MMD morph names.
 *
 * PMX models ship morph names in Japanese/English ("まばたき", "Skirtoff", …).
 * The morph panel uses these dictionaries to show a Chinese label while keeping the
 * original name as a tooltip. Unknown morphs simply fall back to the raw name, so
 * models without an entry still work.
 */

/** Part / outfit switches (material morphs). */
const PART_LABELS: Record<string, string> = {
    "Earphonesoff": "隐藏耳机",
    "Skirtoff": "隐藏裙子",
    "P2-Skirt": "裙子样式 P2",
    "P3-Skirt": "裙子样式 P3",
    "P2-Bar": "配饰样式 P2",
    "P3-Bar": "配饰样式 P3",
    "P2-Sock": "袜子样式 P2",
    "P3-Sock": "袜子样式 P3",
    "P1-Shoesoff": "隐藏鞋子 P1",
    "P2-Shoesoff": "隐藏鞋子 P2",
    "P3-Shoesoff": "隐藏鞋子 P3",
    // common author shortcuts
    "Shoesoff": "隐藏鞋子",
    "Sockoff": "隐藏袜子",
    "HatOff": "隐藏帽子",
    "GlassesOff": "隐藏眼镜"
};

/** Facial expressions (vertex morphs) — the standard MMD expression set. */
const EXPRESSION_LABELS: Record<string, string> = {
    // mouth shapes
    "あ": "张嘴「啊」",
    "あ２": "张嘴「啊」2",
    "あ３": "张嘴「啊」3",
    "い": "张嘴「依」",
    "い２": "张嘴「依」2",
    "い３": "张嘴「依」3",
    "う": "张嘴「乌」",
    "う２": "张嘴「乌」2",
    "え": "张嘴「诶」",
    "お": "张嘴「哦」",
    "お２": "张嘴「哦」2",
    "口角上げ": "嘴角上扬",
    "口角下げ": "嘴角下压",
    "口角下げ右": "嘴角下压（右）",
    "口角下げ左": "嘴角下压（左）",
    "ぺろっ": "吐舌",
    "歯無し": "无牙",
    "歯無し下": "无牙（下）",
    "歯無し左": "无牙（左）",
    // eyes
    "まばたき": "眨眼",
    "ウィンク": "单眼眨眼",
    "ウィンク２": "单眼眨眼 2",
    "ウィンク右": "眨眼（右眼）",
    "ウィンク２右": "眨眼 2（右眼）",
    "びっくり": "惊讶",
    "びっくり左": "惊讶（左）",
    "びっくり右": "惊讶（右）",
    "ｷﾘｯ": "锐利眼神",
    "なごみ": "温柔眼神",
    "はちゅ目": "半眯眼",
    "はぁと": "爱心眼",
    "星目": "星星眼",
    "光消": "眼神无光",
    "瞳大": "瞳孔放大",
    "瞳大左": "瞳孔放大（左）",
    "瞳大右": "瞳孔放大（右）",
    "瞳小": "瞳孔缩小",
    "瞳小左": "瞳孔缩小（左）",
    "瞳小右": "瞳孔缩小（右）",
    // gaze direction
    "上": "视线向上",
    "上右": "视线向上（右）",
    "上左": "视线向上（左）",
    "下": "视线向下",
    "下右": "视线向下（右）",
    "下左": "视线向下（左）",
    // emotions
    "笑い": "微笑",
    "怒り": "生气",
    "怒り右": "生气（右）",
    "怒り左": "生气（左）",
    "困る": "困扰",
    "困る右": "困扰（右）",
    "困る左": "困扰（左）",
    "照れ": "脸红",
    "涙": "眼泪",
    "////": "脸红斜线",
    "汗": "汗滴",
    "怒": "愤怒",
    "滑稽": "滑稽",
    "ぐるぐる": "圈圈眼",
    "はぅ": "害羞",
    "恐ろしい子！": "惊恐"
};

/**
 * Returns a Chinese display label for a morph name, falling back to the raw name.
 * Suffixes such as "右"/"左" (right/left) or trailing digits are handled by explicit
 * entries above; anything else stays as-is.
 */
export function morphLabel(name: string): string {
    const exact = PART_LABELS[name] ?? EXPRESSION_LABELS[name];
    if (exact) return exact;
    return name;
}

/** True when a Chinese label is available (used to decide whether to show a tooltip). */
export function hasMorphLabel(name: string): boolean {
    return PART_LABELS[name] !== undefined || EXPRESSION_LABELS[name] !== undefined;
}
