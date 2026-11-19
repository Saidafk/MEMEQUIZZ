import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Produit .next/standalone : un serveur autonome utilisé par l'image Docker.
  output: "standalone",
  cacheComponents: true,
  // Envoi des images du backoffice (SCRUM-96) : 8 Mo, la limite est aussi contrôlée côté serveur.
  experimental: { serverActions: { bodySizeLimit: "9mb" } },
  partialPrefetching: true,
  // L'optimiseur d'images (SCRUM-56) ne traite que les mèmes, sans paramètre d'URL : il ne peut pas
  // servir à faire redimensionner n'importe quel fichier au VPS.
  images: { localPatterns: [{ pathname: "/memes/**", search: "" }] },
};

export default nextConfig;
