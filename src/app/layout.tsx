import type { Metadata, Viewport } from "next";
import localFont from "next/font/local";

import "./globals.css";
import { Providers } from "./providers";

const gothicA1 = localFont({
  src: [
    { path: "./fonts/gothic-a1-400.ttf", weight: "400", style: "normal" },
    { path: "./fonts/gothic-a1-500.ttf", weight: "500", style: "normal" },
    { path: "./fonts/gothic-a1-700.ttf", weight: "700", style: "normal" },
    { path: "./fonts/gothic-a1-800.ttf", weight: "800", style: "normal" },
    { path: "./fonts/gothic-a1-900.ttf", weight: "900", style: "normal" },
  ],
  variable: "--font-gothic-a1",
  display: "swap",
});

const nunito = localFont({
  src: [
    { path: "./fonts/nunito-700.ttf", weight: "700", style: "normal" },
    { path: "./fonts/nunito-800.ttf", weight: "800", style: "normal" },
    { path: "./fonts/nunito-900.ttf", weight: "900", style: "normal" },
  ],
  variable: "--font-nunito",
  display: "swap",
});

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
};

export const metadata: Metadata = {
  title: "MINGLE",
  description: "MBTI로 알아보는 우리 사이의 케미",
};

const RootLayout = ({ children }: LayoutProps<"/">) => {
  return (
    <html lang="ko" className={`${gothicA1.variable} ${nunito.variable}`}>
      <body>
        <Providers>{children}</Providers>
      </body>
    </html>
  );
};

export default RootLayout;
