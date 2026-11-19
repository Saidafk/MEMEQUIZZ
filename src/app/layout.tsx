import type { Metadata } from "next";
import { Patrick_Hand } from "next/font/google";
import localFont from "next/font/local";
import { DESCRIPTION_SITE, IMAGE_PARTAGE, NOM_SITE, URL_SITE } from "@/lib/seo";
import "./globals.css";
import { EnregistrementServiceWorker } from "./composants/EnregistrementServiceWorker";

// Gaegu est une police coréenne : Google la découpe en ~90 tranches par graisse, soit 180
// @font-face (86 Ko de CSS bloquant) et jusqu'à 44 préchargements (LCP ~8 s, SCRUM-54). On sert à la
// place un sous-ensemble latin (ASCII, Latin-1, ponctuation), découpé avec fonttools (SCRUM-57).
// Licence OFL : polices/OFL-Gaegu.txt.
const gaegu = localFont({
  variable: "--font-gaegu",
  src: [
    { path: "./polices/gaegu-400-latin.woff2", weight: "400", style: "normal" },
    { path: "./polices/gaegu-700-latin.woff2", weight: "700", style: "normal" },
  ],
  fallback: ["Comic Sans MS", "cursive"],
});

const patrickHand = Patrick_Hand({
  variable: "--font-patrick-hand",
  weight: "400",
  subsets: ["latin", "latin-ext"],
});

// Valeurs par défaut, sans canonical ni og:url : ces deux-là seraient héritées par toutes les pages,
// y compris les pages noindex, qui se déclareraient alors copies de l'accueil. Chaque page publique
// pose les siens avec `metadonneesPage` (src/lib/seo.ts).
export const metadata: Metadata = {
  metadataBase: new URL(URL_SITE),
  title: "MEMEQUIZZ",
  description: DESCRIPTION_SITE,
  openGraph: {
    type: "website",
    siteName: NOM_SITE,
    locale: "fr_FR",
    images: [{ url: IMAGE_PARTAGE }],
  },
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
