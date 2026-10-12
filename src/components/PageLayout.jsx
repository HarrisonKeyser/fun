import { useEffect } from 'react';
import BackLink from './BackLink.jsx';
import SiteFooter from './SiteFooter.jsx';
import SoundToggle from './SoundToggle.jsx';
import styles from './PageLayout.module.css';

const SITE_NAME = 'Stats Playground · Harrison Keyser';

/**
 * Shared frame for every page: back arrow (except on the home page),
 * the page content, and the footer.
 *
 * @param {string}  title      Shown in the browser tab. Omit on the home page.
 * @param {boolean} showBack   Show the arrow back to the home page.
 * @param {boolean} showSoundToggle  Show the sound on/off button (for pages that play sounds).
 * @param {'narrow'|'wide'|'full'} width  How wide the content column can get.
 */
export default function PageLayout({
  title,
  showBack = true,
  showSoundToggle = false,
  width = 'narrow',
  children,
}) {
  useEffect(() => {
    document.title = title ? `${title} · Harrison Keyser` : SITE_NAME;
  }, [title]);

  return (
    <div className={styles.page}>
      {(showBack || showSoundToggle) && (
        <nav className={styles.topBar} aria-label="Site">
          {showBack ? <BackLink /> : <span />}
          {showSoundToggle && <SoundToggle />}
        </nav>
      )}
      <main className={`${styles.main} ${styles[width]}`}>{children}</main>
      <SiteFooter />
    </div>
  );
}
