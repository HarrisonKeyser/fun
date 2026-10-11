import { Link } from 'react-router';
import { ROUTE_PATHS } from '../routePaths.js';
import styles from './BackLink.module.css';

export default function BackLink() {
  return (
    <Link to={ROUTE_PATHS.home} className={styles.backLink} aria-label="Back to home page">
      <svg viewBox="0 0 24 24" width="30" height="30" aria-hidden="true">
        <path
          d="M19 12H5M11 5l-7 7 7 7"
          fill="none"
          stroke="currentColor"
          strokeWidth="2.25"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    </Link>
  );
}
