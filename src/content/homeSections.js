/*
  What shows up on the home page, section by section.
  To add a project: add an entry to a section's `projects` list.
  Leave `path` out (or set it to null) to show a thumbnail that isn't clickable yet.
  Thumbnails live in public/images/thumbnails/ (800×450 WebP works well).
*/
import { ROUTE_PATHS } from '../routePaths.js';

export const HOME_SECTIONS = [
  {
    id: 'fun',
    title: 'Fun',
    projects: [
      {
        title: 'Click!',
        path: ROUTE_PATHS.click,
        image: '/images/thumbnails/click.webp',
      },
      {
        title: 'Egyptian Senet',
        path: ROUTE_PATHS.senet,
        image: '/images/thumbnails/senet.webp',
      },
      {
        title: 'Bejeweled Bot',
        path: ROUTE_PATHS.bejeweledBot,
        image: '/images/thumbnails/bejeweled-bot.webp',
      },
      {
        title: 'Clone Hero Auto-Charter',
        path: ROUTE_PATHS.cloneHeroAutochart,
        image: '/images/thumbnails/clone-hero-autochart.webp',
      },
      {
        title: 'Bank Bonuses',
        path: ROUTE_PATHS.bankBonuses,
        image: '/images/thumbnails/bank-bonuses.webp',
      },
    ],
  },
  {
    id: 'learn',
    title: 'Learn',
    projects: [
      {
        title: 'How Many Games of Yahtzee! Are There?',
        path: ROUTE_PATHS.yahtzee,
        image: '/images/thumbnails/yahtzee.webp',
      },
    ],
  },
  {
    id: 'recruiters',
    title: 'Data Analysis Demos (for Recruiters)',
    intro:
      'This section provides some examples of the type of work you can expect me to do. These demo presentations are representative of real business case studies and real presentations which I have given to real businesses. Data and context have been altered to protect privacy. The type of analysis I am able to do is not limited to the presentations shown here. Enjoy 😁.',
    projects: [
      {
        title: 'University Retention',
        path: ROUTE_PATHS.universityRetention,
        image: '/images/thumbnails/university-retention.webp',
      },
      {
        title: 'Flight Safety Trends',
        path: ROUTE_PATHS.flightSafety,
        image: '/images/thumbnails/flight-safety.webp',
      },
    ],
  },
];
