import { cookies } from "next/headers";

import { apiAs } from "@/lib/api/client";
import { noContent } from "@/lib/auth/api-response";
import {
  clearSession,
  readAccessToken,
  readRefreshToken,
} from "@/lib/auth/cookies";

/**
 * Ends one session — this device's, not every device's.
 *
 * The backend needs both halves: the access token says who is asking, and the
 * refresh token says which session family to revoke. Revoking on the access
 * token alone would sign the customer out everywhere, which is a different
 * feature and not one the design offers.
 *
 * This always answers 204. Whatever the backend says, the customer asked to be
 * signed out of this browser and that part is entirely within our gift — the
 * cookies go. A failed revocation leaves a refresh token alive upstream until
 * it expires, which is worth logging one day, but it is not worth refusing to
 * sign someone out over.
 */
export async function POST() {
  const store = await cookies();
  const accessToken = readAccessToken(store);
  const refreshToken = readRefreshToken(store);

  if (accessToken && refreshToken) {
    try {
      await apiAs(accessToken).POST("/auth/logout", {
        body: { refreshToken },
      });
    } catch {
      // Deliberately swallowed — see above.
    }
  }

  clearSession(store);

  return noContent();
}
