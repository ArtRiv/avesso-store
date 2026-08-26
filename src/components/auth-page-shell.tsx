import Link from "next/link";

/**
 * The frame for the pages a customer reaches from an e-mail.
 *
 * These are not in the design's ten artboards — they exist because the backend
 * sends links to them, and without them registration cannot finish. So they
 * borrow rather than invent: the page's warm ground, the wordmark from the
 * header (§2) as the way back into the store, and artboard 05's panel for the
 * content.
 *
 * Narrow and left-aligned. §7 rules out centred body text everywhere except
 * artboards 08 and 09, and these are neither.
 */
export function AuthPageShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-full flex-col">
      <header className="flex h-20 items-center border-b border-hairline px-24">
        <Link
          href="/"
          className="text-[20px] font-semibold tracking-[0.22em] outline-none hover:text-rust focus-visible:outline-1 focus-visible:outline-ink focus-visible:outline-offset-4"
        >
          AVESSO
        </Link>
      </header>

      <main className="mx-auto flex w-full max-w-[1440px] flex-1 flex-col px-24 py-24">
        <div className="w-full max-w-[480px]">{children}</div>
      </main>
    </div>
  );
}
