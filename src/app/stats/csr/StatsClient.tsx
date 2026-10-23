"use client";

import { useEffect, useState } from "react";
import { BlocStats } from "@/components/BlocStats";
import type { Stats } from "@/lib/stats";

type Etat = { etat: "chargement" } | { etat: "erreur" } | { etat: "ok"; stats: Stats };

// CSR : la page livrée est vide, les chiffres sont demandés à /api/stats une fois dans le navigateur.
export function StatsClient() {
  const [resultat, setResultat] = useState<Etat>({ etat: "chargement" });

  useEffect(() => {
    const controle = new AbortController();
    fetch("/api/stats", { signal: controle.signal })
      .then((reponse) => {
        if (!reponse.ok) throw new Error("statistiques indisponibles");
        return reponse.json() as Promise<Stats>;
      })
      .then((stats) => setResultat({ etat: "ok", stats }))
      .catch((erreur: unknown) => {
        if (!(erreur instanceof DOMException && erreur.name === "AbortError")) {
          setResultat({ etat: "erreur" });
        }
      });
    return () => controle.abort();
  }, []);

  if (resultat.etat === "chargement") return <p role="status">Chargement des statistiques…</p>;
  if (resultat.etat === "erreur") {
    return <p role="alert">Les statistiques sont indisponibles pour le moment.</p>;
  }
  return <BlocStats rendu="CSR" stats={resultat.stats} />;
}
