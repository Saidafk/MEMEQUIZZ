import type { Metadata } from "next";
import { Gaegu, Patrick_Hand } from "next/font/google";
import "./globals.css";
import { EnregistrementServiceWorker } from "./composants/EnregistrementServiceWorker";

const gaegu = Gaegu({
  variable: "--font-gaegu",
  weight: ["400", "700"],
  subsets: ["latin"],
});

const patrickHand = Patrick_Hand({
  variable: "--font-patrick-hand",
  weight: "400",
  subsets: ["latin", "latin-ext"],
});

export const metadata: Metadata = {
  title: "MEMEQUIZZ",
  description:
    "Quiz de mèmes : reconnais le mème parmi 4 propositions avant la fin du chrono de 15 secondes.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="fr" className={`${gaegu.variable} ${patrickHand.variable}`}>
      <body>
        {children}
        <EnregistrementServiceWorker />
      </body>
    </html>
  );
}
