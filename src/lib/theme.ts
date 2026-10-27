export const THEME_IDS = ["warm", "ink", "sunset"] as const;

export type ThemeId = (typeof THEME_IDS)[number];

export const DEFAULT_THEME: ThemeId = "warm";
export const THEME_STORAGE_KEY = "ironbeat:theme";

export type ThemeDefinition = {
  id: ThemeId;
  name: string;
  tagline: string;
  themeColor: string;
  swatches: [string, string, string];
};

export const THEMES: ThemeDefinition[] = [
  {
    id: "warm",
    name: "Warm Neutral",
    tagline: "Cream, charcoal, and a hit of amber.",
    themeColor: "#F5F2EC",
    swatches: ["#F5F2EC", "#1C1C1E", "#D4A373"],
  },
  {
    id: "ink",
    name: "Monochrome Ink",
    tagline: "Editorial black and off-white. Zero noise.",
    themeColor: "#0B0B0C",
    swatches: ["#0B0B0C", "#F2F1EC", "#7A7A75"],
  },
  {
    id: "sunset",
    name: "Sunset Glow",
    tagline: "Cream with a hot sunset-orange edge.",
    themeColor: "#F5F2EC",
    swatches: ["#F5F2EC", "#1C1C1E", "#E65F2B"],
  },
];

export const DEFAULT_THEME_DEFINITION = THEMES[0];

export function isThemeId(value: unknown): value is ThemeId {
  return typeof value === "string" && THEME_IDS.includes(value as ThemeId);
}

export function getThemeDefinition(id: ThemeId): ThemeDefinition {
  return THEMES.find((theme) => theme.id === id) ?? DEFAULT_THEME_DEFINITION;
}
