import type { Metadata } from "next";
import { Gaegu, Patrick_Hand } from "next/font/google";
import { DESCRIPTION_SITE, IMAGE_PARTAGE, NOM_SITE, URL_SITE } from "@/lib/seo";
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
