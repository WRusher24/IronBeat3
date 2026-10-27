import { getCurrentUser } from "@/lib/auth-server";
import { json, unauthorized } from "@/lib/http";

export const dynamic = "force-dynamic";

export async function GET() {
  const user = await getCurrentUser();
  if (!user) {
    return unauthorized();
  }

  return json({ user });
}
