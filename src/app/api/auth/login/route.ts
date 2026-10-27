import { eq } from "drizzle-orm";
import type { NextRequest } from "next/server";

import { getDb } from "@/db";
import { users } from "@/db/schema";
import {
  json,
  jsonError,
  tooManyRequests,
  withRouteErrorHandling,
} from "@/lib/http";
import { verifyPassword } from "@/lib/password";
import { checkRateLimit } from "@/lib/rate-limit";
import { getClientIp, isSameOrigin, readJson } from "@/lib/request";
import {
  createSessionToken,
  SESSION_COOKIE,
  sessionCookieOptions,
} from "@/lib/session";
import type { ThemeId } from "@/lib/theme";
import { firstIssue, loginSchema } from "@/lib/validators";
import type { PublicUser } from "@/types";

export const dynamic = "force-dynamic";

const DUMMY_PASSWORD_HASH =
  "$2b$12$5jeajjMg3yYVN5NHCBsB0ep.8SHdGNH1RYcCM7dUW/vc7hQcAA3i.";

export async function POST(request: NextRequest) {
  return withRouteErrorHandling(async () => {
    if (!isSameOrigin(request)) {
      return jsonError("Invalid request origin.", 403);
    }

    const ip = getClientIp(request);
    const ipLimiter = checkRateLimit(`login-ip:${ip}`, 25, 10 * 60_000);
    if (!ipLimiter.allowed) {
      return tooManyRequests(ipLimiter.retryAfterSeconds);
    }

    const parsed = loginSchema.safeParse(await readJson(request));
    if (!parsed.success) {
      return jsonError(firstIssue(parsed.error), 422);
    }

    const { email, password } = parsed.data;
    const emailLimiter = checkRateLimit(`login-email:${email}`, 10, 10 * 60_000);
    if (!emailLimiter.allowed) {
      return tooManyRequests(emailLimiter.retryAfterSeconds);
    }

    const db = getDb();
    const [record] = await db
      .select({
        id: users.id,
        email: users.email,
        displayName: users.displayName,
        theme: users.theme,
        createdAt: users.createdAt,
        passwordHash: users.passwordHash,
      })
      .from(users)
      .where(eq(users.email, email))
      .limit(1);

    const passwordMatches = record
      ? await verifyPassword(password, record.passwordHash)
      : await verifyPassword(password, DUMMY_PASSWORD_HASH);

    if (!record || !passwordMatches) {
      return jsonError("Those credentials don't match an account.", 401);
    }

    const token = await createSessionToken({
      userId: record.id,
      email: record.email,
    });

    const user: PublicUser = {
      id: record.id,
      email: record.email,
      displayName: record.displayName,
      theme: record.theme as ThemeId,
      createdAt: record.createdAt.toISOString(),
    };

    const response = json({ user });
    response.cookies.set(SESSION_COOKIE, token, sessionCookieOptions);
    return response;
  });
}
