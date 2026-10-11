import PageLayout from '../../components/PageLayout.jsx';
import VideoEmbed from '../../components/VideoEmbed.jsx';
import styles from './CaseStudyPage.module.css';

/** Layout for a video page: heading, video, then an optional write-up and client assignment. */
export default function CaseStudyPage({ caseStudy }) {
  const { pageTitle, heading, videoUrl, videoTitle, description, assignment } = caseStudy;

  return (
    <PageLayout title={pageTitle} width="wide">
      <h1 className={styles.heading}>{heading}</h1>

      <VideoEmbed src={videoUrl} title={videoTitle} />

      {(description || assignment) && (
        <div className={styles.writeUp}>
          {description && <p>{description}</p>}

          {assignment && (
            <>
              <h2>Assignment from Client:</h2>
              <blockquote className={styles.assignment}>
                <strong>Task:</strong> {assignment}
              </blockquote>
            </>
          )}
        </div>
      )}
    </PageLayout>
  );
}
