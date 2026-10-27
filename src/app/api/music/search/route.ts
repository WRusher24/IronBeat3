import type { NextRequest } from "next/server";

import { getSessionClaims } from "@/lib/auth-server";
import {
  json,
  jsonError,
  tooManyRequests,
  unauthorized,
  withRouteErrorHandling,
} from "@/lib/http";
import { MusicServiceError, searchMusic } from "@/lib/music";
import { checkRateLimit } from "@/lib/rate-limit";
import {
  firstIssue,
  searchFilterSchema,
  searchQuerySchema,
} from "@/lib/validators";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  return withRouteErrorHandling(async () => {
    const claims = await getSessionClaims();
    if (!claims) {
      return unauthorized();
    }

    const limiter = checkRateLimit(`search:${claims.userId}`, 45, 60_000);
    if (!limiter.allowed) {
      return tooManyRequests(limiter.retryAfterSeconds);
    }

    const queryParam = request.nextUrl.searchParams.get("q") ?? "";
    const parsedQuery = searchQuerySchema.safeParse(queryParam);
    if (!parsedQuery.success) {
      return jsonError(firstIssue(parsedQuery.error), 422);
    }

    const filterParam =
      request.nextUrl.searchParams.get("filter") ?? "videos";
    const parsedFilter = searchFilterSchema.safeParse(filterParam);
    if (!parsedFilter.success) {
      return jsonError("That search filter is not supported.", 422);
    }

    try {
      const tracks = await searchMusic(parsedQuery.data, parsedFilter.data);
      return json({ query: parsedQuery.data, tracks });
    } catch (error) {
      if (error instanceof MusicServiceError) {
        return jsonError(error.message, error.code === "no_audio" ? 422 : 503);
      }
      throw error;
    }
  });
}
