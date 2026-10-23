import styles from "./Logo.module.css";

export function Logo() {
  return (
    <div className={styles.logo}>
      <svg
        width="40"
        height="40"
        viewBox="0 0 40 40"
        aria-hidden="true"
        fill="none"
        stroke="currentColor"
        strokeWidth="2.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <path d="M8 30 C 6 18, 14 6, 22 8 C 32 10, 32 22, 24 24 C 20 25, 20 28, 20 31" />
        <circle cx="20" cy="36" r="1.8" fill="currentColor" />
      </svg>
      <span className={styles.nom}>memequizz</span>
    </div>
  );
}
