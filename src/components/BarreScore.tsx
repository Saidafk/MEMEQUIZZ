import styles from "./BarreScore.module.css";

type Props = {
  question: number;
  totalQuestions: number;
  score: number;
};

const formatPoints = new Intl.NumberFormat("fr-FR");

export function BarreScore({ question, totalQuestions, score }: Props) {
  return (
    <div className={styles.barre}>
      <span>
        Question {question} / {totalQuestions}
      </span>
      <span className={styles.score}>{formatPoints.format(score)} pts</span>
    </div>
  );
}
