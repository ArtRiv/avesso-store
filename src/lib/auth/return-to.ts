/**
 * Reduces a `?next=` parameter to something safe to redirect to.
 *
 * Only a same-origin absolute path survives. Anything else — a full URL, a
 * protocol-relative `//evil.example`, a fragment — becomes the home page.
 * Without this the refresh and login routes would be an open redirect: a link
 * that sends the customer through this app's own domain and out to someone
 * else's, which is how a convincing phishing page gets its address bar.
 */
export function safeReturnTo(raw: string | null | undefined): string {
  if (!raw || !raw.startsWith("/") || raw.startsWith("//")) {
    return "/";
  }

  return raw;
}
