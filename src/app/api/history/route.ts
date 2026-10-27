import { desc, eq } from "drizzle-orm";
import type { NextRequest } from "next/server";

import { getDb } from "@/db";
import { searchHistory } from "@/db/schema";
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
import { firstIssue, historyQuerySchema } from "@/lib/validators";
import type { SearchHistoryEntry } from "@/types";

export const dynamic = "force-dynamic";

export async function GET() {
  return withRouteErrorHandling(async () => {
    const user = await getCurrentUser();
    if (!user) {
      return unauthorized();
    }

    const db = getDb();
    const rows = await db
      .select({
        query: searchHistory.query,
        createdAt: searchHistory.createdAt,
      })
      .from(searchHistory)
      .where(eq(searchHistory.userId, user.id))
      .orderBy(desc(searchHistory.createdAt))
      .limit(160);

    const grouped = new Map<string, SearchHistoryEntry>();

    for (const row of rows) {
      const existing = grouped.get(row.query);
      if (existing) {
        existing.uses += 1;
      } else {
        grouped.set(row.query, {
          query: row.query,
          uses: 1,
          lastUsed: row.createdAt.toISOString(),
        });
      }
    }

    return json({ entries: Array.from(grouped.values()).slice(0, 8) });
  });
}

export async function POST(request: NextRequest) {
  return withRouteErrorHandling(async () => {
    if (!isSameOrigin(request)) {
      return jsonError("Invalid request origin.", 403);
    }

    const user = await getCurrentUser();
    if (!user) {
      return unauthorized();
    }

    const limiter = checkRateLimit(`history:${user.id}`, 40, 60_000);
    if (!limiter.allowed) {
      return tooManyRequests(limiter.retryAfterSeconds);
    }

    const parsed = historyQuerySchema.safeParse(await readJson(request));
    if (!parsed.success) {
      return jsonError(firstIssue(parsed.error), 422);
    }

    const db = getDb();
    await db.insert(searchHistory).values({
      userId: user.id,
      query: parsed.data.query,
    });

    return json({ ok: true }, { status: 201 });
  });
}

export async function DELETE(request: NextRequest) {
  return withRouteErrorHandling(async () => {
    if (!isSameOrigin(request)) {
      return jsonError("Invalid request origin.", 403);
    }

    const user = await getCurrentUser();
    if (!user) {
      return unauthorized();
    }

    const db = getDb();
    await db.delete(searchHistory).where(eq(searchHistory.userId, user.id));

    return json({ ok: true });
  });
}
