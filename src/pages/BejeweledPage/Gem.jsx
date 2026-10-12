/*
  Gem drawings for the demo board: a simple shape per color, so colors can be told
  apart by shape too. Power gems get a sparkle; hypercubes cycle through colors
  (the flicker the real bot used to recognize them).
*/
import { baseColor, HYPERCUBE, isPower } from './botSolver.js';
import styles from './BotDemo.module.css';

const GEM_STYLES = {
  red: { light: '#ff8a80', dark: '#c62828', shape: <circle cx="50" cy="50" r="39" /> },
  orange: { light: '#ffcc80', dark: '#e65100', shape: <rect x="13" y="13" width="74" height="74" rx="14" /> },
  yellow: { light: '#fff59d', dark: '#f9a825', shape: <polygon points="50,9 92,85 8,85" /> },
  green: { light: '#a5d6a7', dark: '#2e7d32', shape: <polygon points="50,7 88,29 88,71 50,93 12,71 12,29" /> },
  blue: { light: '#90caf9', dark: '#1565c0', shape: <polygon points="50,5 93,50 50,95 7,50" /> },
  purple: { light: '#e1bee7', dark: '#7b1fa2', shape: <polygon points="50,7 92,38 76,90 24,90 8,38" /> },
  white: {
    light: '#ffffff',
    dark: '#9eaab8',
    shape: <polygon points="33,9 67,9 91,33 91,67 67,91 33,91 9,67 9,33" />,
  },
};

/** Shared gradients, rendered once per board. */
export function GemDefs() {
  return (
    <svg width="0" height="0" aria-hidden="true" style={{ position: 'absolute' }}>
      <defs>
        {Object.entries(GEM_STYLES).map(([color, { light, dark }]) => (
          <linearGradient key={color} id={`gem-${color}`} x1="0.2" y1="0" x2="0.8" y2="1">
            <stop offset="0" stopColor={light} />
            <stop offset="1" stopColor={dark} />
          </linearGradient>
        ))}
      </defs>
    </svg>
  );
}

export default function Gem({ gem }) {
  if (gem === HYPERCUBE) {
    return (
      <svg viewBox="0 0 100 100" className={`${styles.gemSvg} ${styles.hypercube}`} aria-hidden="true">
        <rect x="12" y="12" width="76" height="76" rx="10" fill="#222" />
        <polygon points="16,16 84,16 50,50" fill="#ef5350" />
        <polygon points="84,16 84,84 50,50" fill="#ffee58" />
        <polygon points="84,84 16,84 50,50" fill="#66bb6a" />
        <polygon points="16,84 16,16 50,50" fill="#42a5f5" />
        <rect x="36" y="36" width="28" height="28" rx="4" fill="#fff" transform="rotate(45 50 50)" />
      </svg>
    );
  }

  const color = baseColor(gem);
  const style = GEM_STYLES[color];
  if (!style) return null;
  const power = isPower(gem);
  return (
    <svg
      viewBox="0 0 100 100"
      className={`${styles.gemSvg} ${power ? styles.powerGem : ''}`}
      aria-hidden="true"
    >
      <g fill={`url(#gem-${color})`} stroke={style.dark} strokeWidth="4" strokeLinejoin="round">
        {style.shape}
      </g>
      <ellipse cx="38" cy="33" rx="13" ry="7" fill="#fff" opacity="0.55" transform="rotate(-30 38 33)" />
      {power && (
        <path
          d="M50 26 L55 45 L74 50 L55 55 L50 74 L45 55 L26 50 L45 45 Z"
          fill="#fff"
          className={styles.sparkle}
        />
      )}
    </svg>
  );
}
