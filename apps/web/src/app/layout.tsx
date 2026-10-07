import type { Metadata, Viewport } from "next";
import { Inter, JetBrains_Mono, Space_Grotesk } from "next/font/google";
import { SiteHeader } from "@/components/site-header";
import "./globals.css";

const spaceGrotesk = Space_Grotesk({
  subsets: ["latin"],
  weight: ["600"],
  variable: "--font-space-grotesk",
});
const inter = Inter({ subsets: ["latin"], variable: "--font-inter" });
const jetbrainsMono = JetBrains_Mono({ subsets: ["latin"], variable: "--font-jetbrains-mono" });

export const metadata: Metadata = {
  title: { default: "zPass", template: "%s · zPass" },
  description: "Prove you belong. Reveal nothing else. Anonymous membership for Zcash communities.",
};

export const viewport: Viewport = {
  themeColor: "#4b3fe0",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html
      lang="en"
      className={`${spaceGrotesk.variable} ${inter.variable} ${jetbrainsMono.variable}`}
    >
      <body className="min-h-dvh antialiased">
        <SiteHeader />
        <main className="mx-auto w-full max-w-[1040px] px-4 py-8 md:px-6 md:py-12">{children}</main>
      </body>
    </html>
  );
}
