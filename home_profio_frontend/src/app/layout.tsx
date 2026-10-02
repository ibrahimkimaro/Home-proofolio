import type { Metadata, Viewport } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { MotionPrefs } from "@/components/MotionPrefs";

const inter = Inter({
  variable: "--font-body",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700", "800"],
});

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  viewportFit: "cover",
};

export const metadata: Metadata = {
  title: "Home Proofolio — Build. Prove. Connect.",
  description:
    "A living professional identity for what you've learned, built, solved, and proved — for developers, designers, founders, students, and every discipline in between.",
};

/**
 * Applies the saved theme and appearance before first paint so there's no flash
 * of the wrong look. Falls back to the OS setting when nothing is saved.
 */
const themeScript = `
(function(){
  try {
    var saved = localStorage.getItem('proofolio-theme');
    if (saved === 'dark' || saved === 'light') {
      document.documentElement.setAttribute('data-theme', saved);
    }
    // Appearance (Settings > Appearance / onboarding): background tone, accent, card material.
    var root = document.documentElement;
    var tone = localStorage.getItem('proofolio-palette');
    if (tone) root.setAttribute('data-palette', tone);
    var accent = localStorage.getItem('proofolio-accent');
    if (accent && /^[a-z]+$/.test(accent)) root.setAttribute('data-accent', accent);
    var custom = localStorage.getItem('proofolio-accent-custom');
    if (accent === 'custom' && /^#[0-9a-f]{6}$/i.test(custom || '')) root.style.setProperty('--pf-ink', custom);
    var glass = localStorage.getItem('proofolio-glass-style');
    if (glass === 'frosted' || glass === 'liquid') root.setAttribute('data-glass', glass);
    var text = localStorage.getItem('proofolio-text');
    if (text === 'small' || text === 'large' || text === 'xlarge') root.setAttribute('data-text', text);
    if (localStorage.getItem('proofolio-motion') === 'reduce') root.setAttribute('data-motion', 'reduce');
    if (localStorage.getItem('proofolio-contrast') === 'more') root.setAttribute('data-contrast', 'more');
  } catch (e) {}
})();
`;

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en" className={`${inter.variable} h-full antialiased`} suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeScript }} />
      </head>
      <body className="min-h-full flex flex-col bg-paper text-ink-800">
        <MotionPrefs>{children}</MotionPrefs>
      </body>
    </html>
  );
}
