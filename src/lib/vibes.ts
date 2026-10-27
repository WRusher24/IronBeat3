export type Vibe = {
  id: string;
  emoji: string;
  label: string;
  subtitle: string;
  query: string;
  accent: string;
  gradient: string;
};

export const VIBES: Vibe[] = [
  {
    id: "phonk",
    emoji: "⚡",
    label: "Phonk & Hype",
    subtitle: "Brazilian phonk, heavy and fast",
    query: "brazilian phonk mix",
    accent: "#E4B384",
    gradient:
      "radial-gradient(120% 120% at 15% 0%, #4A3320 0%, #221A13 46%, #16140F 100%)",
  },
  {
    id: "focus",
    emoji: "🎧",
    label: "Focus & Nasheed",
    subtitle: "Calm, steady, present",
    query: "nasheed focus",
    accent: "#C9D3C3",
    gradient:
      "radial-gradient(120% 120% at 85% 10%, #26342B 0%, #171D19 52%, #101310 100%)",
  },
  {
    id: "lift",
    emoji: "🔥",
    label: "Aggressive Lift",
    subtitle: "Maximum output energy",
    query: "aggressive gym workout music",
    accent: "#E6865B",
    gradient:
      "radial-gradient(120% 120% at 20% 10%, #4B2119 0%, #25130F 52%, #150D0B 100%)",
  },
  {
    id: "cooldown",
    emoji: "🧊",
    label: "Cool Down",
    subtitle: "Bring the heart rate down",
    query: "chill cool down music",
    accent: "#A8C7D8",
    gradient:
      "radial-gradient(120% 120% at 80% 0%, #1E3340 0%, #141E25 50%, #0E1418 100%)",
  },
  {
    id: "bass",
    emoji: "🏋️",
    label: "Heavy Bass",
    subtitle: "Low end for heavy sets",
    query: "heavy bass workout music",
    accent: "#D8B25E",
    gradient:
      "radial-gradient(120% 120% at 25% 100%, #3B2F12 0%, #201B0E 55%, #121009 100%)",
  },
  {
    id: "beast",
    emoji: "🚀",
    label: "Beast Mode",
    subtitle: "Hardstyle. No excuses.",
    query: "beast mode hardstyle gym",
    accent: "#D9A2A2",
    gradient:
      "radial-gradient(120% 120% at 75% 15%, #3B1D2A 0%, #20131A 52%, #120B0F 100%)",
  },
  {
    id: "cardio",
    emoji: "🏃",
    label: "Cardio Flow",
    subtitle: "Keep the pace moving",
    query: "cardio running music mix",
    accent: "#9FC5A0",
    gradient:
      "radial-gradient(120% 120% at 15% 90%, #1C3624 0%, #122018 50%, #0C1410 100%)",
  },
  {
    id: "synth",
    emoji: "🌌",
    label: "Synthwave Energy",
    subtitle: "Neon lights, iron plates",
    query: "synthwave workout music",
    accent: "#C0A8E0",
    gradient:
      "radial-gradient(120% 120% at 80% 100%, #2A1E45 0%, #19122A 52%, #0F0B18 100%)",
  },
];

export const STARTER_CHIPS = [
  "brazilian phonk",
  "gym motivational speech",
  "nasheed",
  "hardstyle workout",
  "lofi focus",
];

export const PLAYLIST_EMOJIS = [
  "🏋️",
  "⚡",
  "🔥",
  "🥊",
  "🚀",
  "🎧",
  "🌊",
  "🧊",
  "🏃",
  "💪",
  "🌅",
  "🌌",
  "🎯",
  "🦍",
  "🥇",
  "🎸",
];
