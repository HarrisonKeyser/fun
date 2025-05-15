import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import './BankBonuses.css';

function BankBonusesPage() {
  const backArrowUrl = 'https://harrisonkeyserfun.s3.us-east-2.amazonaws.com/arrow-go-back.svg';
  const [showFullTerms, setShowFullTerms] = useState({});

  const toggleFullTerms = (id) => {
    setShowFullTerms(prev => ({ ...prev, [id]: !prev[id] }));
  };

  const bankBonuses = [
    {
      id: 'current-q2-2025',
      bankName: 'Current',
      bonusAmount: '$100',
      code: 'HARRISOK763',
      link: 'https://current.com/get-started/?creator_code=HARRISOK763&impression_id=af0069d1-9585-4586-b8fb-5cb529bc3ec9',
      thumbnail: 'https://harrisonkeyserfun.s3.us-east-2.amazonaws.com/currentfavicon.avif',
      checklist: [
        'Sign up for a new Current account using the link above or by applying code HARRISOK763.',
        'Receive one or more qualifying direct deposits (e.g., from an employer or government payer) into your new checking account totaling at least $200 within 45 days of opening your account.',
        'Keep your account open and in good standing until the $100 bonus is paid, which will arrive within 10 business days after your qualifying deposit.',
        '(optional) Once you receive your bonus, you can safely switch your direct deposit settings back to your primary bank and transfer all money out of your Current account.',
        '(optional) Ninety days after opening your account, you may safely close your account if you wish. You are now $100 richer.'
      ],
      quickFacts: {
        bonusRequirementSummary: 'Direct deposit $200 within 45 days for $100 bonus',
        monthlyFees: 'None',
        creditInquiry: 'None',
        availability: 'Nationwide (USA)',
        householdLimit: 'None',
        earlyClosureFee: 'None',
        accountType: 'Personal Checking Account'
      },
      fullTerms: `Current Referral Program

Effective 4/22/25

For existing Current Account users (“Referrer”) to qualify for a $100 referral reward (the “Referral Reward”) and for new Current Account users (“Referred”) to qualify for the Referral Reward, the following conditions must be met:

1. Referred users must sign up for a Current Account through the unique referral link or apply the unique referral code provided by the Referrer, and must be new, first-time Current users.

2. Referred users must receive at least $200 in Eligible Payroll Deposits into their Current Account within the first 45 days of opening their Current Account.  An “Eligible Payroll Deposit” means a recurring deposit of a Current Account user’s wages or compensation from sources such as their employer, payroll provider or government payer, including where they are acting as an independent contractor. Certain deposits do not qualify as Eligible Payroll Deposits, including non-direct deposit ACH transfers, inter- or intra-bank peer-to-peer transfers, transfers made to debit cards from digital wallets or P2P services (PayPal, Venmo, Cash App, Zelle, Google Pay, Facebook Pay, or other similar services), mobile check deposits, cash deposits, and one-time direct deposits (such as tax refunds). Current retains full discretion to determine qualification for Eligible Payroll Deposits and for the Referral Reward.

3. The Referral Reward should be paid to the Referred and Referrer’s Current Accounts within ten (10) business days after a qualifying Eligible Payroll Deposit is first deposited into the Referred’s Account, although delays may occur. To receive the Referral Reward, both Referrer and Referred’s Accounts must not be closed or restricted, and must be in good standing at the time of payment of the Referral Reward.

Additional Terms:
• The Referral Reward cannot be combined with any other enrollment bonuses.
• Referrers may earn no more than $1,000.00 in Referral Rewards per calendar year.`
    },
    // Add more bonuses here
  ];

  return (
    <div className="bank-bonuses-content-wrapper">
      <Link to="/" style={{ position: 'absolute', top: '20px', left: '20px', zIndex: '1000' }}>
        <img src={backArrowUrl} alt="Go back to homepage" style={{ width: '30px', height: '30px', cursor: 'pointer' }} />
      </Link>

      <div className="bank-bonuses-page">
        <div className="page-header">
          <h1>Bank Bonuses</h1>
          <p className="header-summary">
            My Favorite Side Hustle
          </p>
        </div>

        <section className="bonuses-section">
          <div className="bonuses-container">
            {bankBonuses.map(bonus => (
              <div key={bonus.id} className="bonus-item">
                <div className="bonus-header">
                  <img src={bonus.thumbnail} alt={`${bonus.bankName} Bonus Thumbnail`} className="bonus-thumbnail-img" />
                  <h3>{bonus.bankName} - Earn {bonus.bonusAmount} (Beginner Friendly Bonus)</h3>
                </div>
                
              {/* MODIFICATION START: Wrap prompt and button */}
              <div className="bonus-action-area">
                  <p className="bonus-action-prompt">
                    Use Link or Code: <strong className="referral-code">{bonus.code}</strong>
                  </p>
                  <a href={bonus.link} target="_blank" rel="noopener noreferrer" className="bonus-link-button main-action">
                    Sign Up
                  </a>
                </div>
                {/* MODIFICATION END */}

                <div className="bonus-details">
                  <h4>How to Get {bonus.bonusAmount}:</h4>
                  <ol className="checklist">
                    {bonus.checklist.map((item, index) => <li key={index}>{item}</li>)}
                  </ol>
                  {bonus.notes && bonus.notes.length > 0 && (
                    <div className="checklist-notes">
                      {bonus.notes.map((note, index) => <p key={index} className="note-item"><small>{note}</small></p>)}
                    </div>
                  )}
                </div>

                <div className="quick-facts-section">
                  <div className="facts-grid">
                    {Object.entries(bonus.quickFacts).map(([key, value], index) => {
                      const formattedKey = key.replace(/([A-Z])/g, ' $1').replace(/^./, str => str.toUpperCase());
                      return (
                        <div key={index} className="fact-item">
                          <span className="fact-label">{formattedKey}</span>
                          <span className="fact-value">{value}</span>
                        </div>
                      );
                    })}
                  </div>
                </div>
                
                <div className="full-terms-section">
                  <button onClick={() => toggleFullTerms(bonus.id)} className="toggle-terms-button">
                    {showFullTerms[bonus.id] ? 'Hide Full Terms' : 'Show Full Terms'}
                  </button>
                  {showFullTerms[bonus.id] && (
                    <div className="terms-content">
                      {/* The white-space: pre-wrap style is handled by the .terms-content class in your CSS */}
                      <p><small>{bonus.fullTerms}</small></p>
                    </div>
                  )}
                </div>
              </div>
            ))}
            {bankBonuses.length === 0 && <p className="no-bonuses-message">No current bonuses available.</p>}
          </div>
        </section>

        <div className="info-grid">
          <section className="info-card">
            <h3>What is this?</h3>
            <p>
              Banks often offer money for you to try out their services. These promotional funds are baked into the banks' customer acquisition budget.
              The idea is that if a bank can get you to use their service for a few months, you are likely to stay a customer with them for a long time. 
              An astute citizen will notice that they can "try" a bank for a few months, collect the promotional bonus, then close their account.
            </p>
          </section>

          <section className="info-card">
            <h3>Why I Like It</h3>
            <p>
              This is one of my favorite side hustles. It's super easy, super low maintenance, very low-risk, fairly reliable, higher $$/hr than most side hustles, and can make you anywhere between a few hundred and a few thousand
              extra dollars per year. The "hardest" part is often switching your direct deposit a couple times to receive your bonus. However, I find this to be an acceptable chore in exchange for $100+.
            </p>
          </section>

          <section className="info-card">
            <h3>Is this legal?</h3>
            <p>
              Yes. Banks offer these promotions to attract new customers. As long as you meet the terms of the offer, you are doing nothing wrong. Whether you
              choose to continue using the checking account after the promotional term is up to you.
            </p>
          </section>

          <section className="info-card">
            <h3>Will this hurt my credit score?</h3>
            <p>
              If you apply for a credit card, your credit score may be affected. However, opening a checking account will not affect your credit score.
            </p>
          </section>
          
          <section className="info-card">
            <h3>Are there any risks?</h3>
            <p>
              The main "risks" involve not meeting the bonus requirements (e.g. forgetting to do a qualifying direct deposit)
              and thus not receiving the bonus, or accidentally breaking the promotional terms and having your bonus voided/not paid out.
            </p>
          </section>
          
          <section className="info-card">
            <h3>Do banks care about this behavior?</h3>
            <p>
              No. If they did, they would not offer such promotions. Even if they did care, the worst a bank can do is close your account and deny you from doing business with them in the future. They can never steal or seize your funds.
            </p>
          </section>
        </div>
      </div>
    </div>
  );
}

export default BankBonusesPage;