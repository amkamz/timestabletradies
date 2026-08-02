import type { Metadata, Viewport } from "next";
import { Nunito, Space_Mono, Titan_One } from "next/font/google";

import "./globals.css";

const titan = Titan_One({
  variable: "--font-titan",
  subsets: ["latin"],
  weight: "400",
  display: "swap",
});

const nunito = Nunito({
  variable: "--font-nunito",
  subsets: ["latin"],
  weight: ["600", "700", "800", "900"],
  display: "swap",
});

const spaceMono = Space_Mono({
  variable: "--font-space-mono",
  subsets: ["latin"],
  weight: ["400", "700"],
  display: "swap",
});

export const metadata: Metadata = {
  title: "Times Table Tradies",
  description:
    "Learn your times tables as an apprentice tradie — take on jobs, earn coins, and build your own house from the foundations up.",
  applicationName: "Times Table Tradies",
};

export const viewport: Viewport = {
  themeColor: "#fdf4dd",
  // Never block zoom — WCAG 2.2 SC 1.4.4.
  maximumScale: 5,
  userScalable: true,
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html
      lang="en-AU"
      className={`${titan.variable} ${nunito.variable} ${spaceMono.variable} h-full`}
      suppressHydrationWarning
    >
      <head>
        {/*
          Applies the saved accessibility preferences before first paint so
          high-contrast and dyslexia-font users never see a flash of the
          default theme. Kept inline and tiny on purpose.
        */}
        <script
          dangerouslySetInnerHTML={{
            __html: `(function(){try{var s=JSON.parse(localStorage.getItem('ttt_a11y')||'{}');var d=document.documentElement;if(s.dyslexia_font)d.dataset.font='dyslexic';if(s.high_contrast)d.dataset.contrast='high';if(s.reduced_motion)d.dataset.motion='reduced';if(s.text_scale)d.style.setProperty('--a11y-text-scale',String(s.text_scale));}catch(e){}})();`,
          }}
        />
      </head>
      <body className="min-h-full">
        <a href="#main" className="skip-link">
          Skip to main content
        </a>
        {children}
      </body>
    </html>
  );
}
