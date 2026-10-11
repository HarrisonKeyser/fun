import { useSyncExternalStore } from 'react';
import { isMuted, setMuted, subscribeToMute } from '../audio/soundPlayer.js';
import styles from './SoundToggle.module.css';

/** Speaker button that turns the site's sounds on and off (remembered between visits). */
export default function SoundToggle() {
  const muted = useSyncExternalStore(subscribeToMute, isMuted);

  return (
    <button
      type="button"
      className={styles.toggle}
      onClick={() => setMuted(!muted)}
      aria-pressed={!muted}
      aria-label={muted ? 'Turn sound on' : 'Turn sound off'}
      title={muted ? 'Sound off' : 'Sound on'}
    >
      <svg viewBox="0 0 24 24" width="22" height="22" aria-hidden="true">
        <path d="M4 9h4l5-4v14l-5-4H4z" fill="currentColor" />
        {muted ? (
          <path d="M16 9l5 6M21 9l-5 6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
        ) : (
          <path
            d="M16 8.5a5 5 0 0 1 0 7M18.5 6a8.5 8.5 0 0 1 0 12"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
          />
        )}
      </svg>
    </button>
  );
}
