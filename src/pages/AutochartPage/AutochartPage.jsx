import PageLayout from '../../components/PageLayout.jsx';
import {
  AUTOCHART,
  AUTOCHART_DOWNLOAD_URL,
  AUTOCHART_RELEASES_URL,
  AUTOCHART_REPO_URL,
} from '../../content/cloneHeroAutochart.js';
import styles from './AutochartPage.module.css';

export default function AutochartPage() {
  const { title, tagline, intro, download, figure, steps, how, notes, code } = AUTOCHART;

  return (
    <PageLayout title={title} width="wide">
      <header className={styles.header}>
        <h1>{title}</h1>
        <p className={styles.tagline}>{tagline}</p>
      </header>

      <div className={styles.download}>
        <a className={`button ${styles.downloadButton}`} href={AUTOCHART_DOWNLOAD_URL}>
          {download.label}
        </a>
        <p className={styles.downloadDetails}>{download.details}</p>
      </div>

      <figure className={styles.figure}>
        <img src={figure.src} width={figure.width} height={figure.height} alt={figure.alt} />
        <figcaption>{figure.caption}</figcaption>
      </figure>

      <section className={styles.prose}>
        {intro.map((paragraph) => (
          <p key={paragraph}>{paragraph}</p>
        ))}
      </section>

      <section className={styles.section} aria-labelledby="steps-heading">
        <h2 id="steps-heading">{steps.heading}</h2>
        <ol className={styles.steps}>
          {steps.items.map(({ name, text }, i) => (
            <li key={name}>
              <span className={styles.stepNumber}>{i + 1}</span>
              <h3>{name}</h3>
              <p>{text}</p>
            </li>
          ))}
        </ol>
        <p className={styles.smartscreen}>{download.smartscreen}</p>
      </section>

      <section className={styles.section} aria-labelledby="how-heading">
        <h2 id="how-heading">{how.heading}</h2>
        <div className={styles.cards}>
          {how.items.map(({ title: cardTitle, text }) => (
            <article key={cardTitle} className={styles.card}>
              <h3>{cardTitle}</h3>
              <p>{text}</p>
            </article>
          ))}
        </div>
      </section>

      <section className={styles.section} aria-labelledby="notes-heading">
        <h2 id="notes-heading">{notes.heading}</h2>
        <ul className={styles.notes}>
          {notes.items.map((item) => (
            <li key={item}>{item}</li>
          ))}
        </ul>
      </section>

      <section className={`${styles.section} ${styles.codeSection}`} aria-labelledby="code-heading">
        <h2 id="code-heading">{code.heading}</h2>
        <p>{code.text}</p>
        <div className={styles.codeLinks}>
          <a className={`button ${styles.downloadButton}`} href={AUTOCHART_DOWNLOAD_URL}>
            {download.label}
          </a>
          <a className="button" href={AUTOCHART_REPO_URL} target="_blank" rel="noreferrer">
            {code.linkLabel}
          </a>
        </div>
        <p className={styles.releases}>
          <a href={AUTOCHART_RELEASES_URL} target="_blank" rel="noreferrer">
            {download.allVersions}
          </a>
        </p>
        <p className={styles.builtWith}>{code.builtWith}</p>
      </section>
    </PageLayout>
  );
}
