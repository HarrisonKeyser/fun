import styles from './BonusCard.module.css';

export default function BonusCard({ bonus }) {
  const { bankName, bonusAmount, label, referralCode, signUpUrl, logo, steps, quickFacts, fullTerms } =
    bonus;

  return (
    <article className={styles.card}>
      <header className={styles.header}>
        <img src={logo} alt="" className={styles.logo} width="40" height="40" />
        <h2>
          {bankName} - Earn {bonusAmount} {label && `(${label})`}
        </h2>
      </header>

      <div className={styles.action}>
        <p>
          Use Link or Code: <code className={styles.code}>{referralCode}</code>
        </p>
        <a href={signUpUrl} target="_blank" rel="noopener noreferrer" className={styles.signUp}>
          Sign Up
        </a>
      </div>

      <div className={styles.steps}>
        <h3>How to Get {bonusAmount}:</h3>
        <ol>
          {steps.map((step) => (
            <li key={step}>{step}</li>
          ))}
        </ol>
      </div>

      <dl className={styles.facts}>
        {quickFacts.map(({ label: factLabel, value }) => (
          <div key={factLabel}>
            <dt>{factLabel}</dt>
            <dd>{value}</dd>
          </div>
        ))}
      </dl>

      <details className={styles.terms}>
        <summary>
          <span className={styles.showLabel}>Show</span>
          <span className={styles.hideLabel}>Hide</span> Full Terms
        </summary>
        <div className={styles.termsText}>{fullTerms}</div>
      </details>
    </article>
  );
}
