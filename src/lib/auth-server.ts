import { eq } from "drizzle-orm";
import { cookies } from "next/headers";

import { getDb } from "@/db";
import { users } from "@/db/schema";
import {
  SESSION_COOKIE,
  verifySessionToken,
  type SessionClaims,
} from "@/lib/session";
import type { PublicUser } from "@/types";
import type { ThemeId } from "@/lib/theme";

export async function getSessionClaims(): Promise<SessionClaims | null> {
  const cookieStore = await cookies();
  return verifySessionToken(cookieStore.get(SESSION_COOKIE)?.value);
}

export async function getCurrentUser(): Promise<PublicUser | null> {
  const claims = await getSessionClaims();
  if (!claims) {
    return null;
  }

  const db = getDb();
  const [record] = await db
    .select({
      id: users.id,
      email: users.email,
      displayName: users.displayName,
      theme: users.theme,
      createdAt: users.createdAt,
    })
    .from(users)
    .where(eq(users.id, claims.userId))
    .limit(1);

  if (!record) {
    return null;
  }

  return {
    id: record.id,
    email: record.email,
    displayName: record.displayName,
    theme: record.theme as ThemeId,
    createdAt: record.createdAt.toISOString(),
  };
}
