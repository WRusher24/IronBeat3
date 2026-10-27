import { SignJWT, jwtVerify } from "jose";

export const SESSION_COOKIE = "ironbeat_session";
export const SESSION_DURATION_SECONDS = 60 * 60 * 24 * 30;

const DEVELOPMENT_SECRET =
  "ironbeat-local-development-secret-change-me-before-production";

let warnedAboutDevelopmentSecret = false;

function getSecretKey(): Uint8Array {
  const configured = process.env.AUTH_SECRET;

  if (!configured) {
    if (process.env.NODE_ENV === "production") {
      throw new Error(
        "AUTH_SECRET is not set. Add a long random value to your environment before deploying.",
      );
    }

    if (!warnedAboutDevelopmentSecret) {
      console.warn(
        "[ironbeat] AUTH_SECRET is not set — using an insecure development secret. Add AUTH_SECRET to .env.local.",
      );
      warnedAboutDevelopmentSecret = true;
    }

    return new TextEncoder().encode(DEVELOPMENT_SECRET);
  }

  if (process.env.NODE_ENV === "production" && configured.length < 32) {
    throw new Error("AUTH_SECRET must be at least 32 characters in production.");
  }

  return new TextEncoder().encode(configured);
}

export type SessionClaims = {
  userId: string;
  email: string;
};

export async function createSessionToken(claims: SessionClaims): Promise<string> {
  return new SignJWT({ email: claims.email })
    .setProtectedHeader({ alg: "HS256", typ: "JWT" })
    .setSubject(claims.userId)
    .setIssuedAt()
    .setExpirationTime(`${SESSION_DURATION_SECONDS}s`)
    .sign(getSecretKey());
}

export async function verifySessionToken(
  token: string | undefined | null,
): Promise<SessionClaims | null> {
  if (!token) {
    return null;
  }

  try {
    const { payload } = await jwtVerify(token, getSecretKey(), {
      algorithms: ["HS256"],
    });

    if (
      typeof payload.sub !== "string" ||
      typeof payload.email !== "string" ||
      payload.sub.length === 0
    ) {
      return null;
    }

    return {
      userId: payload.sub,
      email: payload.email,
    };
  } catch {
    return null;
  }
}

export const sessionCookieOptions = {
  httpOnly: true,
  sameSite: "lax" as const,
  secure: process.env.NODE_ENV === "production",
  path: "/",
  maxAge: SESSION_DURATION_SECONDS,
};

const STREAM_TOKEN_AUDIENCE = "ironbeat-audio-relay";

export async function createStreamToken(
  videoId: string,
  urls: string[] = [],
): Promise<string> {
  return new SignJWT({ scope: "audio", urls })
    .setProtectedHeader({ alg: "HS256", typ: "JWT" })
    .setSubject(videoId)
    .setAudience(STREAM_TOKEN_AUDIENCE)
    .setIssuedAt()
    .setExpirationTime("2h")
    .sign(getSecretKey());
}

export async function verifyStreamToken(
  token: string | null | undefined,
  videoId: string,
): Promise<boolean> {
  if (!token) {
    return false;
  }

  try {
    const { payload } = await jwtVerify(token, getSecretKey(), {
      algorithms: ["HS256"],
      audience: STREAM_TOKEN_AUDIENCE,
    });

    return payload.sub === videoId;
  } catch {
    return false;
  }
}

// Returns the upstream URLs bound into a valid stream token, or null when the
// token is invalid. Lets the relay skip re-resolving the track on a cold
// serverless instance.
export async function readStreamTokenSources(
  token: string | null | undefined,
  videoId: string,
): Promise<string[] | null> {
  if (!token) {
    return null;
  }

  try {
    const { payload } = await jwtVerify(token, getSecretKey(), {
      algorithms: ["HS256"],
      audience: STREAM_TOKEN_AUDIENCE,
    });

    if (payload.sub !== videoId) {
      return null;
    }

    const urls = Array.isArray(payload.urls) ? payload.urls : [];
    return urls.filter(
      (url): url is string => typeof url === "string" && /^https?:\/\//i.test(url),
    );
  } catch {
    return null;
  }
}
