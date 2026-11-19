import Link from "next/link";
import styles from "./NavRendus.module.css";

const RENDUS = [
  { rendu: "CSR", href: "/stats/csr", detail: "construite dans le navigateur" },
  { rendu: "SSR", href: "/stats/ssr", detail: "construite par le serveur à chaque visite" },
  { rendu: "SSG", href: "/stats/ssg", detail: "préparée au build, régénérée toutes les heures" },
] as const;

export type ModeRenduNav = (typeof RENDUS)[number]["rendu"];

// Passer d'un rendu à l'autre sans revenir à /stats : on compare la même page, servie trois fois.
export function NavRendus({ actif, details = false }: { actif?: ModeRenduNav; details?: boolean }) {
  return (
    <nav aria-label="Modes de rendu" className={styles.nav}>
      {RENDUS.map((r) => (
        <Link
          key={r.rendu}
          href={r.href}
          aria-current={r.rendu === actif ? "page" : undefined}
          className={r.rendu === actif ? `${styles.rendu} ${styles.actif}` : styles.rendu}
        >
          <span className={styles.sigle}>{r.rendu}</span>
          {details && <span className={styles.detail}>{r.detail}</span>}
        </Link>
      ))}
    </nav>
  );
}
