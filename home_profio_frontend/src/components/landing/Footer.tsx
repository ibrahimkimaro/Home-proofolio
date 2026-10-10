import Image from "next/image";
import Link from "next/link";

export type FooterColumn = { heading: string; links: { label: string; href: string }[] };

const COLUMNS: FooterColumn[] = [
  {
    heading: "Platform",
    links: [
      { label: "Features", href: "#features" },
      { label: "Who it's for", href: "#who-its-for" },
      { label: "How it works", href: "#how-it-works" },
      { label: "Proof, not claims", href: "#proof" },
      { label: "CV & connect", href: "#connect" },
    ],
  },
  {
    heading: "Account",
    links: [
      { label: "Sign in", href: "/login" },
      { label: "Get started", href: "/start" },
    ],
  },
  {
    heading: "Legal",
    links: [
      { label: "Privacy Policy", href: "/privacy" },
      { label: "Terms of Service", href: "/terms" },
    ],
  },
];

/**
 * Shared by both landing pages. "night" is the scroll-driven page's version, over its dark stage;
 * `columns` replaces the default links for pages whose sections are named differently.
 */
export function Footer({ variant = "light", columns = COLUMNS }: { variant?: "light" | "night"; columns?: FooterColumn[] }) {
  const night = variant === "night";
  return (
    <footer className={`relative px-5 py-16 ${night ? "z-10 border-t border-white/15 bg-black/40 text-white backdrop-blur-sm sm:px-10 lg:px-[8vw]" : "border-t border-hairline bg-paper"}`}>
      <div className="mx-auto max-w-6xl">
        <div className="flex flex-col gap-12 md:flex-row md:justify-between">
          <div className="max-w-xs">
            <div className="flex items-center gap-2.5">
              <Image
                src="/images/home-profolio-logo.jpeg"
                alt="Home Proofolio"
                width={30}
                height={30}
                className="rounded-full object-cover"
              />
              <span className={`font-display text-base ${night ? "text-white" : "text-ink-700"}`}>Home Proofolio</span>
            </div>
            <p className={`mt-4 text-[14px] leading-relaxed ${night ? "text-white/65" : "text-slate"}`}>
              Build. Prove. Connect. A living professional identity for every discipline.
            </p>
          </div>

          <div className="flex gap-16">
            {columns.map((col) => (
              <div key={col.heading}>
                <p className={`text-[13px] font-medium ${night ? "text-white" : "text-ink-700"}`}>{col.heading}</p>
                <ul className="mt-4 flex flex-col gap-2.5">
                  {col.links.map((link) => (
                    <li key={link.label}>
                      <Link
                        href={link.href}
                        className={`text-[14px] transition-colors ${night ? "text-white/65 hover:text-white" : "text-slate hover:text-ink-700"}`}
                      >
                        {link.label}
                      </Link>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </div>

        <div className={`mt-14 flex flex-col sm:flex-row items-center justify-between gap-4 border-t pt-6 text-[13px] ${night ? "border-white/15 text-white/55" : "border-hairline text-slate"}`}>
          <div>&copy; {new Date().getFullYear()} Home Proofolio. All rights reserved.</div>
          <div className="flex items-center gap-5">
            <Link href="/privacy" className="hover:underline">Privacy Policy</Link>
            <Link href="/terms" className="hover:underline">Terms of Service</Link>
          </div>
        </div>
      </div>
    </footer>
  );
}
