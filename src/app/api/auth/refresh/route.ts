import { cookies } from "next/headers";
import { NextResponse, type NextRequest } from "next/server";

import { clearSession, readRefreshToken, setSession } from "@/lib/auth/cookies";
import { refreshSession } from "@/lib/auth/refresh";
import { safeReturnTo } from "@/lib/auth/return-to";

/**
 * The only route in this app the refresh cookie is sent to — that is what its
 * path scoping buys — and so the only place a session can be renewed.
 *
 * It answers two callers with two shapes, on purpose:
 *
 * GET is the proxy's. A page navigation arrived with no access token, the
 * proxy bounced it here, and the customer must end up on the page they asked
 * for either way. So GET always redirects, signed in or not.
 *
 * POST is the browser's. A fetch came back 401, so src/lib/api/browser.ts asks
 * for a new token and retries. A redirect would be wrong there — a 307 keeps
 * the method and body, so a failed cart POST would arrive here as a POST — and
 * the caller wants a yes or no, not a page.
 */

export async function GET(request: NextRequest) {
  const returnTo = safeReturnTo(request.nextUrl.searchParams.get("next"));

  await renew();

  // Whether the renewal worked or not, the customer goes where they were
  // going. A public page renders signed out; a page that needs a session
  // sends them to sign in on its own terms. Redirecting to a login screen
  // from here would interrupt someone who was only browsing the catalogue.
  return NextResponse.redirect(new URL(returnTo, request.nextUrl.origin));
}

export async function POST() {
  const renewed = await renew();

  if (!renewed) {
    return NextResponse.json(
      { error: "Sessão expirada." },
      { status: 401 },
    );
  }

  // No body. The new token is in an httpOnly cookie, and handing a copy to
  // the browser would undo the reason it is in one.
  return new NextResponse(null, { status: 204 });
}

async function renew(): Promise<boolean> {
  const store = await cookies();
  const refreshToken = readRefreshToken(store);

  if (!refreshToken) {
    // The marker may still say there is a session. There is not — clear the
    // whole set so the proxy stops bouncing requests here.
    clearSession(store);

    return false;
  }

  try {
    setSession(store, await refreshSession(refreshToken));

    return true;
  } catch {
    // Expired, already spent, or revoked as a family. All three mean the same
    // thing to the customer, and none of them is recoverable by trying again.
    clearSession(store);

    return false;
  }
}
