import type { Metadata, Viewport } from "next";
import { Gothic_A1, Nunito } from "next/font/google";
import "./globals.css";

const gothicA1 = Gothic_A1({
  weight: ["400", "500", "700", "800", "900"],
  subsets: ["latin"],
  variable: "--font-gothic-a1",
  display: "swap",
});

const nunito = Nunito({
  weight: ["700", "800", "900"],
  subsets: ["latin"],
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

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="ko" className={`${gothicA1.variable} ${nunito.variable}`}>
      <body>{children}</body>
    </html>
  );
}
