import { eq } from "drizzle-orm";
import type { NextRequest } from "next/server";

import { getDb } from "@/db";
import { users } from "@/db/schema";
import { getCurrentUser } from "@/lib/auth-server";
import {
  json,
  jsonError,
  tooManyRequests,
  unauthorized,
  withRouteErrorHandling,
} from "@/lib/http";
import { checkRateLimit } from "@/lib/rate-limit";
import { isSameOrigin, readJson } from "@/lib/request";
import type { ThemeId } from "@/lib/theme";
import { firstIssue, updateMeSchema } from "@/lib/validators";

export const dynamic = "force-dynamic";

export async function GET() {
  const user = await getCurrentUser();
  if (!user) {
    return unauthorized();
  }

  return json({ user });
}

export async function PATCH(request: NextRequest) {
  return withRouteErrorHandling(async () => {
    if (!isSameOrigin(request)) {
      return jsonError("Invalid request origin.", 403);
    }

    const user = await getCurrentUser();
    if (!user) {
      return unauthorized();
    }

    const limiter = checkRateLimit(`me:${user.id}`, 30, 60_000);
    if (!limiter.allowed) {
      return tooManyRequests(limiter.retryAfterSeconds);
    }

    const parsed = updateMeSchema.safeParse(await readJson(request));
    if (!parsed.success) {
      return jsonError(firstIssue(parsed.error), 422);
    }

    const updates: {
      theme?: string;
      displayName?: string;
      updatedAt: Date;
    } = { updatedAt: new Date() };

    if (parsed.data.theme) {
      updates.theme = parsed.data.theme;
    }

    if (parsed.data.displayName !== undefined) {
      updates.displayName = parsed.data.displayName;
    }

    const db = getDb();
    const [updated] = await db
      .update(users)
      .set(updates)
      .where(eq(users.id, user.id))
      .returning({
        id: users.id,
        email: users.email,
        displayName: users.displayName,
        theme: users.theme,
        createdAt: users.createdAt,
      });

    if (!updated) {
      return unauthorized();
    }

    return json({
      user: {
        id: updated.id,
        email: updated.email,
        displayName: updated.displayName,
        theme: updated.theme as ThemeId,
        createdAt: updated.createdAt.toISOString(),
      },
    });
  });
}
