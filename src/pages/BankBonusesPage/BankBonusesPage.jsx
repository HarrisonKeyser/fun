import PageLayout from '../../components/PageLayout.jsx';
import BonusCard from './BonusCard.jsx';
import { BANK_BONUS_FAQ, BANK_BONUSES } from '../../content/bankBonuses.js';
import styles from './BankBonusesPage.module.css';

export default function BankBonusesPage() {
  return (
    <PageLayout title="Bank Bonuses" width="wide">
      <header className={styles.header}>
        <h1>Bank Bonuses</h1>
        <p>My Favorite Side Hustle</p>
      </header>

      <section className={styles.bonuses} aria-label="Current offers">
        {BANK_BONUSES.length > 0 ? (
          BANK_BONUSES.map((bonus) => <BonusCard key={bonus.id} bonus={bonus} />)
        ) : (
          <p>No current bonuses available.</p>
        )}
      </section>

      <section className={styles.faq} aria-label="Frequently asked questions">
        {BANK_BONUS_FAQ.map(({ question, answer }) => (
          <article key={question} className={styles.faqCard}>
            <h2>{question}</h2>
            <p>{answer}</p>
          </article>
        ))}
      </section>
    </PageLayout>
  );
}
