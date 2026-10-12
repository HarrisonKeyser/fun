import styles from './CastingSticks.module.css';

/**
 * The four casting sticks. Before a roll they're shown faded so the layout doesn't jump.
 * @param {boolean} compact  Smaller sticks (used in the game review).
 */
export default function CastingSticks({ sticks, compact = false }) {
  const shown = sticks ?? [null, null, null, null];

  return (
    <div className={`${styles.sticks} ${compact ? styles.compact : ''}`} aria-hidden="true">
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
