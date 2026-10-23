import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Produit .next/standalone : un serveur autonome utilisé par l'image Docker.
  output: "standalone",
  cacheComponents: true,
  // Envoi des images du backoffice (SCRUM-96) : 8 Mo, la limite est aussi contrôlée côté serveur.
  experimental: { serverActions: { bodySizeLimit: "9mb" } },
  partialPrefetching: true,
};

export default nextConfig;
