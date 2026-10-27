const USER_AGENT =
  "Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.0 Mobile/15E148 Safari/604.1 IronBeat/1.0";

export class UpstreamError extends Error {
  readonly status?: number;

  constructor(message: string, status?: number) {
    super(message);
    this.name = "UpstreamError";
    this.status = status;
  }
}

export async function fetchJson<T>(
  url: string,
  timeoutMs = 8_000,
): Promise<T> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const response = await fetch(url, {
      cache: "no-store",
      redirect: "follow",
      signal: controller.signal,
      headers: {
        Accept: "application/json",
        "Accept-Language": "en-US,en;q=0.9",
        "User-Agent": USER_AGENT,
      },
    });

    if (!response.ok) {
      throw new UpstreamError(
        `Upstream responded with ${response.status}.`,
        response.status,
      );
    }

    const text = await response.text();
    if (!text) {
      throw new UpstreamError("Upstream returned an empty response.");
    }

    try {
      return JSON.parse(text) as T;
    } catch {
      throw new UpstreamError("Upstream returned a non-JSON response.");
    }
  } catch (error) {
    if (error instanceof UpstreamError) {
      throw error;
    }

    if (error instanceof Error && error.name === "AbortError") {
      throw new UpstreamError("Upstream request timed out.");
    }

    throw new UpstreamError(
      error instanceof Error ? error.message : "Upstream request failed.",
    );
  } finally {
    clearTimeout(timer);
  }
}

export function absoluteUrl(value: string, base: string): string {
  try {
    return new URL(value, `${base}/`).toString();
  } catch {
    return value;
  }
}

export function hostOf(value: string): string | null {
  try {
    return new URL(value).host.toLowerCase();
  } catch {
    return null;
  }
}

export { USER_AGENT };
