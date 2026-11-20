import type { Metadata, Viewport } from "next";
import { Manrope } from "next/font/google";
import { cookies } from "next/headers";
import { Providers } from "@/components/providers";
import "./globals.css";

// Manrope, self-hosted by next/font (no request to Google at runtime).
// "Xmind" isn't in next/font's Google Fonts catalogue, so Manrope is the
// chosen fallback. Manrope is a variable font: every weight 200–800 is in.
const manrope = Manrope({
  subsets: ["latin"],
  display: "swap",
  variable: "--font-manrope",
});

export const metadata: Metadata = {
  title: { default: "Transition Tracker", template: "%s · Transition Tracker" },
  description: "Track, update and report on the web development transition.",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#FAFCFE" },
    { media: "(prefers-color-scheme: dark)", color: "#0C1018" },
  ],
};

export default async function RootLayout({ children }: LayoutProps<"/">) {
  const theme = (await cookies()).get("theme")?.value;
  const dataTheme = theme === "light" || theme === "dark" ? theme : undefined;

  return (
    <html lang="en" data-theme={dataTheme} className={manrope.variable}>
      <body className="min-h-dvh bg-bg font-sans text-text">
        <Providers initialTheme={dataTheme ?? "system"}>{children}</Providers>
      </body>
    </html>
  );
}
