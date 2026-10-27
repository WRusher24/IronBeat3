import { MusicServiceError } from "./types";

const DEFAULT_PIPED_INSTANCES = [
  "https://pipedapi.ducks.party",
  "https://api.piped.private.coffee",
  "https://pipedapi.kavin.rocks",
  "https://pipedapi.reallyaweso.me",
  "https://pipedapi.adminforge.de",
];

const DEFAULT_INVIDIOUS_INSTANCES = [
  "https://yt.chocolatemoo53.com",
  "https://invidious.nerdvpn.de",
  "https://invidious.materialio.us",
  "https://iv.melmac.space",
  "https://invidious.jing.rocks",
  "https://yewtu.be",
  "https://invidious.privacyredirect.com",
  "https://invidious.reallyaweso.me",
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
