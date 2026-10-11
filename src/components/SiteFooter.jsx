import styles from './SiteFooter.module.css';

export default function SiteFooter() {
  const year = new Date().getFullYear();

  return <footer className={styles.footer}>© {year}. A website by Harrison Keyser</footer>;
}
