import type { Metadata } from "next";
import { Gaegu, Patrick_Hand } from "next/font/google";
import { URL_SITE, metadonneesPage } from "@/lib/seo";
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

// Valeurs par défaut : chaque page publique les redéfinit avec `metadonneesPage` (src/lib/seo.ts).
export const metadata: Metadata = {
  metadataBase: new URL(URL_SITE),
  ...metadonneesPage({
    titre: "MEMEQUIZZ",
    description:
      "Quiz de mèmes : reconnais le mème parmi 4 propositions avant la fin du chrono de 15 secondes.",
    chemin: "/",
  }),
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
