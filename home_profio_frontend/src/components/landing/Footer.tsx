import Image from "next/image";
import Link from "next/link";

const COLUMNS = [
  {
    heading: "Platform",
    links: [
      { label: "Who it's for", href: "#who-its-for" },
      { label: "How it works", href: "#how-it-works" },
      { label: "Proof, not claims", href: "#proof" },
    ],
  },
  {
    heading: "Account",
    links: [
      { label: "Sign in", href: "/login" },
      { label: "Get started", href: "/start" },
    ],
  },
];

export function Footer() {
  return (
    <footer className="border-t border-hairline bg-paper px-5 py-16">
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
              <span className="font-display text-base text-ink-700">Home Proofolio</span>
            </div>
            <p className="mt-4 text-[14px] leading-relaxed text-slate">
              Build. Prove. Connect. A living professional identity for every discipline.
            </p>
          </div>

          <div className="flex gap-16">
            {COLUMNS.map((col) => (
              <div key={col.heading}>
                <p className="text-[13px] font-medium text-ink-700">{col.heading}</p>
                <ul className="mt-4 flex flex-col gap-2.5">
                  {col.links.map((link) => (
                    <li key={link.label}>
                      <Link
                        href={link.href}
                        className="text-[14px] text-slate transition-colors hover:text-ink-700"
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

        <div className="mt-14 border-t border-hairline pt-6 text-[13px] text-slate">
          &copy; {new Date().getFullYear()} Home Proofolio.
        </div>
      </div>
    </footer>
  );
}
