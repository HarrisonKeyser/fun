import { useEffect, useRef, useState } from 'react';
import Confetti from 'react-confetti';
import PageLayout from '../../components/PageLayout.jsx';
import useWindowSize from '../../hooks/useWindowSize.js';
import styles from './ClickPage.module.css';

// One note per click, climbing a C-major scale and looping back around.
const NOTE_SOUNDS = ['c-low', 'd', 'e', 'f', 'g', 'a', 'b', 'c-high'].map(
  (note) => `/audio/notes/${note}.mp3`,
);
const CELEBRATION_SOUND = '/audio/confetti.mp3';
const CELEBRATION_MS = 5000;

const MIN_CLICKS = 1;
const MAX_CLICKS = 1000;
const DEFAULT_CLICKS = 10;

function playSound(src) {
  const audio = new Audio(src);
  audio.play().catch(() => {
    // Browsers can block audio until the visitor interacts with the page; safe to ignore.
  });
}

export default function ClickPage() {
  const [clicksToFill, setClicksToFill] = useState(DEFAULT_CLICKS);
  const [clicks, setClicks] = useState(0);
  const [celebrating, setCelebrating] = useState(false);
  const [showConfetti, setShowConfetti] = useState(false);
  const noteIndex = useRef(0);
  const fillRef = useRef(null);
  const percentRef = useRef(null);
  const { width, height } = useWindowSize();

  const progress = Math.min(100, (clicks / clicksToFill) * 100);
  const isFull = clicks >= clicksToFill;
  const canReset = isFull && !celebrating;

  // After a few seconds of celebrating, let the confetti wind down and offer a reset.
  useEffect(() => {
    if (!celebrating) return undefined;

    const timer = setTimeout(() => setCelebrating(false), CELEBRATION_MS);
    return () => clearTimeout(timer);
  }, [celebrating]);

  function pulse(element) {
    element?.animate([{ transform: 'scale(1.05)' }, { transform: 'scale(1)' }], {
      duration: 100,
      easing: 'ease-out',
    });
  }

  function handleClick() {
    if (isFull) return;

    playSound(NOTE_SOUNDS[noteIndex.current % NOTE_SOUNDS.length]);
    noteIndex.current += 1;
    pulse(fillRef.current);
    pulse(percentRef.current);

    const newClicks = clicks + 1;
    setClicks(newClicks);

    if (newClicks >= clicksToFill) {
      playSound(CELEBRATION_SOUND);
      setCelebrating(true);
      setShowConfetti(true);
    }
  }

  function reset() {
    setClicks(0);
    setCelebrating(false);
    setShowConfetti(false);
  }

  function handleClicksToFillChange(event) {
    const value = Number.parseInt(event.target.value, 10);
    if (Number.isNaN(value)) return;

    setClicksToFill(Math.min(MAX_CLICKS, Math.max(MIN_CLICKS, value)));
    reset();
  }

  return (
    <PageLayout title="Click!">
      {showConfetti && (
        <Confetti
          width={width}
          height={height}
          recycle={celebrating}
          onConfettiComplete={() => setShowConfetti(false)}
          style={{ position: 'fixed', inset: 0, pointerEvents: 'none', zIndex: 10 }}
        />
      )}

      <h1 className={styles.title}>Click!!!!</h1>

      <button
        type="button"
        className={styles.track}
        onClick={handleClick}
        aria-label="Click to fill the bar"
      >
        <span ref={fillRef} className={styles.fill} style={{ width: `${progress}%` }} />
      </button>

      {canReset && (
        <button type="button" className={`button ${styles.resetButton}`} onClick={reset}>
          Reset
        </button>
      )}

      <div className={styles.settings}>
        <label htmlFor="clicks-to-fill" className={styles.settingsLabel}>
          Clicks to fill:
        </label>
        <input
          type="range"
          min={MIN_CLICKS}
          max={MAX_CLICKS}
          value={clicksToFill}
          onChange={handleClicksToFillChange}
          className={styles.slider}
          aria-label="Clicks to fill (slider)"
        />
        <input
          id="clicks-to-fill"
          type="number"
          inputMode="numeric"
          min={MIN_CLICKS}
          max={MAX_CLICKS}
          value={clicksToFill}
          onChange={handleClicksToFillChange}
          className={styles.numberInput}
        />
      </div>

      {/* The percentage grows as the bar fills, from invisible at 0% to large at 100%. */}
      <div
        ref={percentRef}
        className={styles.percent}
        style={{ fontSize: `${progress / 3}px` }}
        aria-live="polite"
      >
        {progress.toFixed(2)}%
      </div>
    </PageLayout>
  );
}
