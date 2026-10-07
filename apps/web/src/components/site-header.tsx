import Link from "next/link";

const NAV = [
  { href: "/me", label: "My passes" },
  { href: "/developers", label: "Developers" },
  { href: "/beacon", label: "Beacon" },
  { href: "/how-it-works", label: "How it works" },
];

export function SiteHeader() {
  return (
    <header className="border-b border-border">
      <div className="mx-auto flex h-14 w-full max-w-[1040px] items-center justify-between px-4 md:px-6">
        <Link href="/" className="font-[family-name:var(--font-space-grotesk)] font-semibold">
          z<span className="text-primary">Pass</span>
        </Link>
        <nav aria-label="Main" className="flex gap-4 text-sm text-muted">
          {NAV.map((item) => (
            <Link key={item.href} href={item.href} className="hover:text-text">
              {item.label}
            </Link>
          ))}
        </nav>
      </div>
    </header>
  );
}
