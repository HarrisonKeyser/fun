import styles from './CastingSticks.module.css';

/** The four casting sticks. Before a roll they're shown faded so the layout doesn't jump. */
export default function CastingSticks({ sticks }) {
  const shown = sticks ?? [null, null, null, null];

  return (
    <div className={styles.sticks} aria-hidden="true">
      {shown.map((isLight, index) => (
        <span
          key={index}
          className={`${styles.stick} ${
            isLight === null ? styles.unthrown : isLight ? styles.lightSide : styles.darkSide
          }`}
        />
      ))}
    </div>
  );
}
