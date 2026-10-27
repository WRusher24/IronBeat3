import { eq } from "drizzle-orm";
import type { NextRequest } from "next/server";

import { getDb } from "@/db";
import { users } from "@/db/schema";
import { isUniqueViolation } from "@/lib/db-errors";
import {
  json,
  jsonError,
  tooManyRequests,
  withRouteErrorHandling,
} from "@/lib/http";
import { hashPassword } from "@/lib/password";
import { checkRateLimit } from "@/lib/rate-limit";
import { getClientIp, isSameOrigin, readJson } from "@/lib/request";
import {
  createSessionToken,
  SESSION_COOKIE,
  sessionCookieOptions,
} from "@/lib/session";
import type { ThemeId } from "@/lib/theme";
import { firstIssue, registerSchema } from "@/lib/validators";
import type { PublicUser } from "@/types";

export const dynamic = "force-dynamic";

export async function POST(request: NextRequest) {
  return withRouteErrorHandling(async () => {
    if (!isSameOrigin(request)) {
      return jsonError("Invalid request origin.", 403);
    }

    const ip = getClientIp(request);
    const limiter = checkRateLimit(`register:${ip}`, 8, 10 * 60_000);
    if (!limiter.allowed) {
      return tooManyRequests(limiter.retryAfterSeconds);
    }

    const parsed = registerSchema.safeParse(await readJson(request));
    if (!parsed.success) {
      return jsonError(firstIssue(parsed.error), 422);
    }

    const { email, password } = parsed.data;
    const displayName = (
      parsed.data.displayName?.trim() ||
      email.split("@")[0]?.trim() ||
      "Athlete"
    ).slice(0, 40);

    const db = getDb();
    const [existing] = await db
      .select({ id: users.id })
      .from(users)
      .where(eq(users.email, email))
      .limit(1);

    if (existing) {
      return jsonError(
        "An account with that email already exists. Try signing in instead.",
        409,
      );
    }

    const passwordHash = await hashPassword(password);

    try {
      const [created] = await db
        .insert(users)
        .values({ email, passwordHash, displayName })
        .returning({
          id: users.id,
          email: users.email,
          displayName: users.displayName,
          theme: users.theme,
          createdAt: users.createdAt,
        });

      if (!created) {
        throw new Error("User insert returned no row.");
      }

      const token = await createSessionToken({
        userId: created.id,
        email: created.email,
      });

      const user: PublicUser = {
        id: created.id,
        email: created.email,
        displayName: created.displayName,
        theme: created.theme as ThemeId,
        createdAt: created.createdAt.toISOString(),
      };

      const response = json({ user }, { status: 201 });
      response.cookies.set(SESSION_COOKIE, token, sessionCookieOptions);
      return response;
    } catch (error) {
      if (isUniqueViolation(error)) {
        return jsonError(
          "An account with that email already exists. Try signing in instead.",
          409,
        );
      }
      throw error;
    }
  });
}
