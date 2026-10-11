import { Link } from 'react-router';
import styles from './ProjectCard.module.css';

/** A clickable thumbnail on the home page. Without a `path`, it shows as not-yet-available. */
export default function ProjectCard({ title, path, image }) {
  const thumbnail = <img src={image} alt={title} className={styles.image} width="800" height="450" loading="lazy" />;

  if (!path) {
    return <div className={`${styles.card} ${styles.unavailable}`}>{thumbnail}</div>;
  }

  return (
    <Link to={path} className={styles.card}>
      {thumbnail}
    </Link>
  );
}
