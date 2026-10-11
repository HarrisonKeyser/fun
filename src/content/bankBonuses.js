/*
  Bank bonus offers and the FAQ on the Bank Bonuses page.
  To add an offer, copy an entry in BANK_BONUSES and change the details.
  To retire one, delete its entry (the page shows a message when the list is empty).
*/
export const BANK_BONUSES = [
  {
    id: 'current-2026',
    bankName: 'Current',
    bonusAmount: '$100',
    label: 'Beginner Friendly Bonus',
    referralCode: 'HARRISOK763',
    signUpUrl:
      'https://current.com/get-started/?creator_code=HARRISOK763&impression_id=5656c28e-0a9a-4771-a885-1dfb4df70f2b',
    logo: '/images/logos/current.avif',
    steps: [
      'Sign up for a new Current account using the link above or by applying code HARRISOK763.',
      'Receive one or more qualifying direct deposits (e.g., from an employer or government payer) into your new checking account totaling at least $1,500 within 35 days of opening your account.',
      'Keep your account open and in good standing until the $100 bonus is paid, which will arrive within 10 business days after your qualifying deposits reach $1,500.',
      '(optional) Once you receive your bonus, you can safely switch your direct deposit settings back to your primary bank and transfer all money out of your Current account.',
      '(optional) Ninety days after opening your account, you may safely close your account if you wish. You are now $100 richer.',
    ],
    quickFacts: [
      { label: 'Bonus Requirement Summary', value: 'Direct deposit $1,500 within 35 days for $100 bonus' },
      { label: 'Monthly Fees', value: 'None' },
      { label: 'Credit Inquiry', value: 'None' },
      { label: 'Availability', value: 'Nationwide (USA)' },
      { label: 'Household Limit', value: 'None' },
      { label: 'Early Closure Fee', value: 'None' },
      { label: 'Account Type', value: 'Personal Checking Account' },
    ],
    termsUrl: 'https://current.com/tiered-referral-program-terms-and-conditions-1-500/',
    termsEffectiveDate: 'August 12, 2026',
    termsHighlights: [
      'Only new, first-time Current customers who sign up with a referral link or code qualify.',
      'Only recurring paychecks or government payments count. Transfers from other banks or apps (Venmo, Zelle, PayPal, etc.), mobile check deposits, cash, and one-time deposits like tax refunds do not.',
      'This bonus cannot be combined with other sign-up bonuses.',
      'Current can change or end the program at any time, and can take back rewards it believes were earned through error, fraud, or abuse.',
    ],
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
