/*
  Bank bonus offers and the FAQ on the Bank Bonuses page.
  To add an offer, copy an entry in BANK_BONUSES and change the details.
  To retire one, delete its entry (the page shows a message when the list is empty).
*/
import { imageUrl } from './images.js';

export const BANK_BONUSES = [
  {
    id: 'current-q2-2025',
    bankName: 'Current',
    bonusAmount: '$100',
    label: 'Beginner Friendly Bonus',
    referralCode: 'HARRISOK763',
    signUpUrl:
      'https://current.com/get-started/?creator_code=HARRISOK763&impression_id=af0069d1-9585-4586-b8fb-5cb529bc3ec9',
    logo: imageUrl('currentfavicon.avif'),
    steps: [
      'Sign up for a new Current account using the link above or by applying code HARRISOK763.',
      'Receive one or more qualifying direct deposits (e.g., from an employer or government payer) into your new checking account totaling at least $200 within 45 days of opening your account.',
      'Keep your account open and in good standing until the $100 bonus is paid, which will arrive within 10 business days after your qualifying deposit.',
      '(optional) Once you receive your bonus, you can safely switch your direct deposit settings back to your primary bank and transfer all money out of your Current account.',
      '(optional) Ninety days after opening your account, you may safely close your account if you wish. You are now $100 richer.',
    ],
    quickFacts: [
      { label: 'Bonus Requirement Summary', value: 'Direct deposit $200 within 45 days for $100 bonus' },
      { label: 'Monthly Fees', value: 'None' },
      { label: 'Credit Inquiry', value: 'None' },
      { label: 'Availability', value: 'Nationwide (USA)' },
      { label: 'Household Limit', value: 'None' },
      { label: 'Early Closure Fee', value: 'None' },
      { label: 'Account Type', value: 'Personal Checking Account' },
    ],
    fullTerms: `Current Referral Program

Effective 4/22/25

For existing Current Account users (“Referrer”) to qualify for a $100 referral reward (the “Referral Reward”) and for new Current Account users (“Referred”) to qualify for the Referral Reward, the following conditions must be met:

1. Referred users must sign up for a Current Account through the unique referral link or apply the unique referral code provided by the Referrer, and must be new, first-time Current users.

2. Referred users must receive at least $200 in Eligible Payroll Deposits into their Current Account within the first 45 days of opening their Current Account.  An “Eligible Payroll Deposit” means a recurring deposit of a Current Account user’s wages or compensation from sources such as their employer, payroll provider or government payer, including where they are acting as an independent contractor. Certain deposits do not qualify as Eligible Payroll Deposits, including non-direct deposit ACH transfers, inter- or intra-bank peer-to-peer transfers, transfers made to debit cards from digital wallets or P2P services (PayPal, Venmo, Cash App, Zelle, Google Pay, Facebook Pay, or other similar services), mobile check deposits, cash deposits, and one-time direct deposits (such as tax refunds). Current retains full discretion to determine qualification for Eligible Payroll Deposits and for the Referral Reward.

3. The Referral Reward should be paid to the Referred and Referrer’s Current Accounts within ten (10) business days after a qualifying Eligible Payroll Deposit is first deposited into the Referred’s Account, although delays may occur. To receive the Referral Reward, both Referrer and Referred’s Accounts must not be closed or restricted, and must be in good standing at the time of payment of the Referral Reward.

Additional Terms:
• The Referral Reward cannot be combined with any other enrollment bonuses.
• Referrers may earn no more than $1,000.00 in Referral Rewards per calendar year.`,
  },
];

export const BANK_BONUS_FAQ = [
  {
    question: 'What is this?',
    answer:
      'Banks often offer money for you to try out their services. These promotional funds are baked into the banks\' customer acquisition budget. The idea is that if a bank can get you to use their service for a few months, you are likely to stay a customer with them for a long time. An astute citizen will notice that they can "try" a bank for a few months, collect the promotional bonus, then close their account.',
  },
  {
    question: 'Why I Like It',
    answer:
      'This is one of my favorite side hustles. It\'s super easy, super low maintenance, very low-risk, fairly reliable, higher $$/hr than most side hustles, and can make you anywhere between a few hundred and a few thousand extra dollars per year. The "hardest" part is often switching your direct deposit a couple times to receive your bonus. However, I find this to be an acceptable chore in exchange for $100+.',
  },
  {
    question: 'Is this legal?',
    answer:
      'Yes. Banks offer these promotions to attract new customers. As long as you meet the terms of the offer, you are doing nothing wrong. Whether you choose to continue using the checking account after the promotional term is up to you.',
  },
  {
    question: 'Will this hurt my credit score?',
    answer:
      'If you apply for a credit card, your credit score may be affected. However, opening a checking account will not affect your credit score.',
  },
  {
    question: 'Are there any risks?',
    answer:
      'The main "risks" involve not meeting the bonus requirements (e.g. forgetting to do a qualifying direct deposit) and thus not receiving the bonus, or accidentally breaking the promotional terms and having your bonus voided/not paid out.',
  },
  {
    question: 'Do banks care about this behavior?',
    answer:
      'No. If they did, they would not offer such promotions. Even if they did care, the worst a bank can do is close your account and deny you from doing business with them in the future. They can never steal or seize your funds.',
  },
];
