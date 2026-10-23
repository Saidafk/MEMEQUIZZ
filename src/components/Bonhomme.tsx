type Props = { largeur?: number };

// Bonhomme bâton qui se gratte la tête devant un point d'interrogation (dessin original).
export function Bonhomme({ largeur = 300 }: Props) {
  return (
    <svg
      width={largeur}
      viewBox="0 0 300 200"
      role="img"
      aria-label="Dessin d'un bonhomme bâton qui se gratte la tête devant un point d'interrogation"
      fill="none"
      stroke="currentColor"
      strokeWidth="3"
      strokeLinecap="round"
      strokeLinejoin="round"
      style={{ maxWidth: "100%", height: "auto" }}
    >
      <circle cx="90" cy="62" r="22" />
      <path d="M82 58 l2 0 M98 58 l2 0" />
      <path d="M83 72 q7 -4 14 0" />
      <path d="M90 84 L90 140 M90 100 L62 120 M90 100 L112 74 L104 52 M90 140 L70 182 M90 140 L112 182" />
      <path d="M180 60 C 176 30, 236 26, 236 60 C 236 84, 206 84, 206 108" />
      <circle cx="206" cy="130" r="4" fill="currentColor" />
      <path d="M150 40 l10 -10 M156 54 l14 -4 M250 30 l12 -8" />
    </svg>
  );
}
