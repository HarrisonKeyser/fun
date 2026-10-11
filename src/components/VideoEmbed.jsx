import styles from './VideoEmbed.module.css';

/** A Google Drive video that scales to fit any screen at 16:9. */
export default function VideoEmbed({ src, title }) {
  return (
    <div className={styles.frame}>
      <iframe
        src={src}
        title={title}
        allow="autoplay; fullscreen"
        allowFullScreen
        loading="lazy"
      />
    </div>
  );
}
