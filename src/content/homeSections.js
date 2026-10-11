/*
  What shows up on the home page, section by section.
  To add a project: add an entry to a section's `projects` list.
  Leave `path` out (or set it to null) to show a thumbnail that isn't clickable yet.
*/
import { ROUTE_PATHS } from '../routePaths.js';
import { imageUrl } from './images.js';

export const HOME_SECTIONS = [
  {
    id: 'fun',
    title: 'Fun',
    projects: [
      {
        title: 'Click!',
        path: ROUTE_PATHS.click,
        image: imageUrl('ClickThumbnail.png'),
      },
      {
        title: 'Egyptian Senet',
        path: ROUTE_PATHS.senet,
        image: imageUrl('SenetWebsiteThumbnail.png'),
      },
      {
        title: 'Bank Bonuses',
        path: ROUTE_PATHS.bankBonuses,
        image: imageUrl('WebsiteThumbnailBonuses.png'),
      },
    ],
  },
  {
    id: 'learn',
    title: 'Learn',
    projects: [
      {
        title: 'Predicting Baseball Home Runs (under construction)',
        path: null,
        image: imageUrl('BaseballThumbnailConstruction.png'),
      },
      {
        title: 'How Many Games of Yahtzee! Are There?',
        path: ROUTE_PATHS.yahtzee,
        image: imageUrl('YahtzeeThumbnailwebsiteversion.png'),
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
        image: imageUrl('UniversityWebsiteThumbnail.png'),
      },
      {
        title: 'Flight Safety Trends',
        path: ROUTE_PATHS.flightSafety,
        image: imageUrl('FlightSafetyThumbnail.png'),
      },
    ],
  },
];
