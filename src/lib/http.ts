import { NextResponse } from "next/server";

export function json<T>(data: T, init?: ResponseInit): NextResponse {
  const headers = new Headers(init?.headers);
  if (!headers.has("Cache-Control")) {
    headers.set("Cache-Control", "no-store");
  }

  return NextResponse.json(data, { ...init, headers });
}

export function jsonError(
  message: string,
  status = 400,
  extraHeaders?: HeadersInit,
): NextResponse {
  const headers = new Headers(extraHeaders);
  if (!headers.has("Cache-Control")) {
    headers.set("Cache-Control", "no-store");
  }

  return NextResponse.json({ error: message }, { status, headers });
}

export function unauthorized(): NextResponse {
  return jsonError("You need to sign in to do that.", 401);
}

export function tooManyRequests(retryAfterSeconds: number): NextResponse {
  return jsonError("Too many requests. Take a breath and try again.", 429, {
    "Retry-After": String(Math.max(1, Math.ceil(retryAfterSeconds))),
  });
}

export function notFound(message = "Not found."): NextResponse {
  return jsonError(message, 404);
}

export function forbidden(message = "That request is not allowed."): NextResponse {
  return jsonError(message, 403);
}

export async function withRouteErrorHandling(
  handler: () => Promise<NextResponse>,
): Promise<NextResponse> {
  try {
    return await handler();
  } catch (error) {
    console.error("[ironbeat:api]", error);
    return jsonError("Something went wrong on our side. Please retry.", 500);
  }
}
