import type { NextRequest } from "next/server";

import { json, jsonError } from "@/lib/http";
import { isSameOrigin } from "@/lib/request";
import {
  SESSION_COOKIE,
  sessionCookieOptions,
} from "@/lib/session";

export const dynamic = "force-dynamic";

export async function POST(request: NextRequest) {
  if (!isSameOrigin(request)) {
    return jsonError("Invalid request origin.", 403);
  }

  const response = json({ ok: true });
  response.cookies.set(SESSION_COOKIE, "", {
    ...sessionCookieOptions,
    maxAge: 0,
    expires: new Date(0),
  });
  return response;
}
