import "./globals.css";
import type { Metadata } from "next";
import { Bricolage_Grotesque, Plus_Jakarta_Sans, JetBrains_Mono } from "next/font/google";
import { ThemeProvider } from "@/components/layout/theme-provider";
import { Navbar } from "@/components/layout/navbar";
import { AuroraBg } from "@/components/layout/aurora-bg";
import { FloatingChatbot } from "@/components/chat/floating-chatbot";


const display = Bricolage_Grotesque({
  subsets: ["latin"],
  variable: "--font-display",
  display: "swap",
  weight: ["400", "500", "600", "700", "800"],
});

const sans = Plus_Jakarta_Sans({
  subsets: ["latin"],
  variable: "--font-sans",
  display: "swap",
  weight: ["400", "500", "600", "700"],
});

const mono = JetBrains_Mono({
  subsets: ["latin"],
  variable: "--font-mono",
  display: "swap",
  weight: ["400", "500", "600"],
});


export const metadata: Metadata = {
  title: "Drishti AI — Material selection for engineers",
  description:
  "Standards-aware material selection. Set your service conditions and review best-fit material recommendations with ASTM-aligned references.",
  icons: [{ rel: "icon", url: "/favicon.ico" }],
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html
      lang="en"
      suppressHydrationWarning
      className={`${display.variable} ${sans.variable} ${mono.variable}`}
    >
      <body className="font-sans antialiased">
        <ThemeProvider
          attribute="class"
          defaultTheme="dark"
          enableSystem
          disableTransitionOnChange={false}
        >
          {/* Background layers */}
          <AuroraBg />
          <div className="fixed inset-0 -z-10 bg-grid pointer-events-none" />
          <div className="noise -z-10" />

          {/* App shell */}
          <Navbar />
<main className="mx-auto w-full max-w-7xl px-4 pb-8 pt-8 md:px-8">
  {children}
</main>
<footer className="mx-auto w-full max-w-7xl px-4 pb-6 text-xs text-subtle md:px-8">
  <div className="border-t border-fg/10 pt-4">
    <p>
      Drishti AI is an explainable selection assistant. Always validate
      against applicable codes, standards, and project requirements.
    </p>
  </div>
</footer>

          {/* Global floating chatbot — visible on every page */}
          <FloatingChatbot />
        </ThemeProvider>
      </body>
    </html>
  );
}
