"use client";

import { useState, useSyncExternalStore } from "react";
import styles from "./ActiverNotifications.module.css";

type Etat = "inactif" | "en_cours" | "actif" | "refuse" | "erreur";

// La clé VAPID publique est transmise au navigateur sous forme binaire (base64 URL-safe).
function cleEnOctets(cle: string): Uint8Array<ArrayBuffer> {
  const base64 = (cle + "=".repeat((4 - (cle.length % 4)) % 4))
    .replace(/-/g, "+")
    .replace(/_/g, "/");
  return Uint8Array.from(atob(base64), (c) => c.charCodeAt(0));
}

const PRISE_EN_CHARGE = () =>
  "serviceWorker" in navigator && "PushManager" in window && "Notification" in window;

// Propose les rappels du quiz du jour. Rien n'est demandé tant que le joueur n'a pas cliqué
// (la permission de notification n'est jamais réclamée au chargement de la page).
export function ActiverNotifications() {
  const [etat, setEtat] = useState<Etat>("inactif");
  const disponible = useSyncExternalStore(
    () => () => {},
    PRISE_EN_CHARGE,
    () => false,
  );
  if (!disponible) return null;

  async function activer() {
    setEtat("en_cours");
    try {
      if ((await Notification.requestPermission()) !== "granted") return setEtat("refuse");
      const reponseCle = await fetch("/api/push/cle");
      if (!reponseCle.ok) return setEtat("erreur");
      const { cle } = (await reponseCle.json()) as { cle: string };
      const enregistrement = await navigator.serviceWorker.ready;
      const abonnement = await enregistrement.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: cleEnOctets(cle),
      });
      const envoi = await fetch("/api/push/abonnements", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(abonnement.toJSON()),
      });
      setEtat(envoi.ok ? "actif" : "erreur");
    } catch {
      setEtat("erreur");
    }
  }

  return (
    <div className={styles.bloc}>
      <button
        type="button"
        className={styles.bouton}
        onClick={() => void activer()}
        disabled={etat === "en_cours" || etat === "actif"}
      >
        Me rappeler le quiz du jour
      </button>
      <p role="status" className={styles.message}>
        {etat === "actif" && "✓ Rappels activés sur cet appareil."}
        {etat === "refuse" &&
          "✗ Notifications refusées : autorise-les dans les réglages du navigateur."}
        {etat === "erreur" && "✗ Impossible d'activer les rappels pour le moment. Réessaie."}
      </p>
    </div>
  );
}
