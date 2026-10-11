import PageLayout from '../../components/PageLayout.jsx';
import ProjectCard from './ProjectCard.jsx';
import { HOME_SECTIONS } from '../../content/homeSections.js';
import styles from './HomePage.module.css';

export default function HomePage() {
  return (
    <PageLayout showBack={false} width="wide">
      <h1 className="visually-hidden">Harrison Keyser — Stats Playground</h1>

      {HOME_SECTIONS.map((section) => (
        <section key={section.id} className={styles.section} aria-labelledby={`${section.id}-title`}>
          <h2 id={`${section.id}-title`} className={styles.sectionTitle}>
            {section.title}
          </h2>

          {section.intro && <p className={styles.intro}>{section.intro}</p>}

          <ul className={styles.grid}>
            {section.projects.map((project) => (
              <li key={project.title}>
                <ProjectCard {...project} />
              </li>
            ))}
          </ul>
        </section>
      ))}
    </PageLayout>
  );
}
