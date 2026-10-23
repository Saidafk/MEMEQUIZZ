import Link from "next/link";
import type { ReactNode } from "react";
import styles from "./BoutonLien.module.css";

type Props = {
  href: string;
  children: ReactNode;
  variante?: "plein" | "contour";
};

// Un lien (navigation) habillé comme un bouton ; pour une action, utiliser <button>.
export function BoutonLien({ href, children, variante = "plein" }: Props) {
  return (
    <Link href={href} className={`${styles.bouton} ${styles[variante]}`}>
      {children}
    </Link>
  );
}
