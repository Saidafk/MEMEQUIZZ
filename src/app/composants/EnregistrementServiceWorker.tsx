"use client";

import { useEffect } from "react";

// Enregistre le service worker en production uniquement : en développement,
// un cache actif masquerait les changements de code.
export function EnregistrementServiceWorker() {
  useEffect(() => {
    if (process.env.NODE_ENV !== "production") return;
    if (!("serviceWorker" in navigator)) return;
    navigator.serviceWorker.register("/sw.js").catch(() => {
      // Sans service worker l'application reste utilisable en ligne.
    });
  }, []);

  return null;
}
