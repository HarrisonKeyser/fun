import PageLayout from '../../components/PageLayout.jsx';
import VideoEmbed from '../../components/VideoEmbed.jsx';
import BotDemo from './BotDemo.jsx';
import { BEJEWELED_BOT, BEJEWELED_REPO_URL } from '../../content/bejeweledBot.js';
import styles from './BejeweledPage.module.css';

export default function BejeweledPage() {
  const { title, tagline, intro, stats, figure, videoUrl, videoTitle, demo, pipeline, phases, problems, code } =
    BEJEWELED_BOT;

  return (
    <PageLayout title={title} width="wide">
      <header className={styles.header}>
        <h1>{title}</h1>
        <p className={styles.tagline}>{tagline}</p>
      </header>

      <section className={styles.prose}>
        {intro.map((paragraph) => (
          <p key={paragraph}>{paragraph}</p>
        ))}
      </section>

      <ul className={styles.stats} aria-label="Results">
        {stats.map(({ value, label }) => (
          <li key={label}>
            <span className={styles.statValue}>{value}</span>
            <span className={styles.statLabel}>{label}</span>
          </li>
        ))}
      </ul>

      <figure className={styles.figure}>
        <img src={figure.src} width={figure.width} height={figure.height} alt={figure.alt} loading="lazy" />
        <figcaption>{figure.caption}</figcaption>
      </figure>

      {videoUrl && (
        <div className={styles.video}>
          <VideoEmbed src={videoUrl} title={videoTitle} />
        </div>
      )}

      <section className={styles.section} aria-labelledby="demo-heading">
        <h2 id="demo-heading">{demo.heading}</h2>
        <p className={styles.sectionIntro}>{demo.text}</p>
        <BotDemo />
      </section>

      <section className={styles.section} aria-labelledby="pipeline-heading">
        <h2 id="pipeline-heading">{pipeline.heading}</h2>
        <ol className={styles.pipeline}>
          {pipeline.steps.map(({ name, detail }) => (
            <li key={name}>
              <strong>{name}</strong>
              <span>{detail}</span>
            </li>
          ))}
        </ol>
        <p className={styles.loopNote}>↻ {pipeline.loopNote}</p>

        <ol className={styles.phases}>
          {phases.map(({ name, text }, i) => (
            <li key={name}>
              <span className={styles.phaseNumber}>{i + 1}</span>
              <h3>{name}</h3>
              <p>{text}</p>
            </li>
          ))}
        </ol>
      </section>

      <section className={styles.section} aria-labelledby="problems-heading">
        <h2 id="problems-heading">{problems.heading}</h2>
        <div className={styles.problems}>
          {problems.items.map(({ title: problemTitle, text }) => (
            <article key={problemTitle} className={styles.card}>
              <h3>{problemTitle}</h3>
              <p>{text}</p>
            </article>
          ))}
        </div>
      </section>

      <section className={`${styles.section} ${styles.codeSection}`} aria-labelledby="code-heading">
        <h2 id="code-heading">{code.heading}</h2>
        <p>{code.text}</p>
        <a className={`button ${styles.githubButton}`} href={BEJEWELED_REPO_URL} target="_blank" rel="noreferrer">
          {code.linkLabel}
        </a>
        <p className={styles.builtWith}>{code.builtWith}</p>
      </section>
    </PageLayout>
  );
}
