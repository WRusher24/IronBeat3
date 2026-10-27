import { MusicServiceError } from "./types";

const DEFAULT_PIPED_INSTANCES = [
  "https://api.piped.private.coffee",
  "https://pipedapi.ducks.party",
  "https://pipedapi.kavin.rocks",
  "https://pipedapi.leptons.xyz",
  "https://pipedapi.nosebs.ru",
  "https://pipedapi.reallyaweso.me",
  "https://pipedapi.adminforge.de",
  "https://api.piped.yt",
  "https://pipedapi.drgns.space",
  "https://pipedapi.owo.si",
  "https://pipedapi-libre.kavin.rocks",
  "https://piped-api.privacy.com.de",
  "https://piped-api.codespace.cz",
  "https://pipedapi.darkness.services",
  "https://pipedapi.orangenet.cc",
];

const DEFAULT_INVIDIOUS_INSTANCES = [
  "https://yt.chocolatemoo53.com",
  "https://invidious.materialio.us",
  "https://invidious.nerdvpn.de",
  "https://invidious.tiekoetter.com",
  "https://inv.nadeko.net",
];

export type HealthScope = "search" | "stream";

function parseInstanceList(value: string | undefined, fallback: string[]): string[] {
  if (!value) {
    return fallback;
  }

  const parsed = value
    .split(",")
    .map((entry) => entry.trim().replace(/\/+$/, ""))
    .filter(Boolean)
    .filter((entry) => {
      try {
        const url = new URL(entry);
        return url.protocol === "https:" || url.protocol === "http:";
      } catch {
        return false;
      }
    });

  return parsed.length > 0 ? parsed : fallback;
}

export const PIPED_INSTANCES = parseInstanceList(
  process.env.PIPED_API_INSTANCES,
  DEFAULT_PIPED_INSTANCES,
);

export const INVIDIOUS_INSTANCES = parseInstanceList(
  process.env.INVIDIOUS_INSTANCES,
  DEFAULT_INVIDIOUS_INSTANCES,
);

const coolingDown = new Map<string, number>();

function healthKey(base: string, scope: HealthScope): string {
  return `${scope}:${base}`;
}

export function isCoolingDown(
  base: string,
  scope: HealthScope = "stream",
): boolean {
  const key = healthKey(base, scope);
  const until = coolingDown.get(key);
  if (!until) {
    return false;
  }

  if (until <= Date.now()) {
    coolingDown.delete(key);
    return false;
  }

  return true;
}

export function markInstanceHealthy(
  base: string,
  scope: HealthScope = "stream",
): void {
  coolingDown.delete(healthKey(base, scope));
}

export function markInstanceDown(
  base: string,
  durationMs = 120_000,
  scope: HealthScope = "stream",
): void {
  coolingDown.set(healthKey(base, scope), Date.now() + durationMs);
}

export function getCandidates(
  provider: "piped" | "invidious",
  limit: number,
  scope: HealthScope = "stream",
): string[] {
  const all = provider === "piped" ? PIPED_INSTANCES : INVIDIOUS_INSTANCES;
  const healthy = all.filter((base) => !isCoolingDown(base, scope));
  const pool = healthy.length > 0 ? healthy : all;
  return pool.slice(0, limit);
}

export function upstreamTimeoutError(label: string): MusicServiceError {
  return new MusicServiceError(
    `${label} did not respond in time.`,
    "unavailable",
  );
}
