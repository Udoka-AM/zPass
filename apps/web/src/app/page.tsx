import Link from "next/link";

export default function HomePage() {
  return (
    <section className="space-y-6">
      <h1 className="text-[32px] leading-9 font-semibold md:text-[40px] md:leading-[44px]">
        Prove you belong. Reveal nothing else.
      </h1>
      <p className="max-w-[68ch] text-muted">
        zPass turns your Zcash community credential into a private pass. Join holder chats and vote
        in polls without revealing which item you hold, your address or who you are. Not even the
        issuer can link your uses.
      </p>
      <div className="flex gap-3">
        <Link
          href="/enrol"
          className="inline-flex h-11 items-center rounded-[var(--radius-control)] bg-primary px-5 font-medium text-primary-ink"
        >
          Get your pass
        </Link>
        <Link
          href="/developers"
          className="inline-flex h-11 items-center rounded-[var(--radius-control)] border border-border bg-surface px-5 font-medium"
        >
          For developers
        </Link>
      </div>
    </section>
  );
}
