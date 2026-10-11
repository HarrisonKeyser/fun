/*
  Video pages: the Yahtzee explainer and the recruiter case-study demos.
  Each entry becomes its own page using the same layout (pages/CaseStudyPage).
*/
import { ROUTE_PATHS } from '../routePaths.js';

export const CASE_STUDIES = [
  {
    path: ROUTE_PATHS.yahtzee,
    pageTitle: 'How Many Games of Yahtzee! Are There?',
    heading: (
      <>
        How Many Games of <i>Yahtzee!</i> Are There?
      </>
    ),
    videoUrl: 'https://drive.google.com/file/d/1l0rXg4Wb9oyWO-tTKk52edQK_YG_TKwo/preview',
    videoTitle: 'Yahtzee video',
  },
  {
    path: ROUTE_PATHS.universityRetention,
    pageTitle: 'University Retention',
    heading: 'University Retention',
    videoUrl: 'https://drive.google.com/file/d/1ljbeo1Ny-XSQVAVpxDPlpB0IG2ZweP3b/preview',
    videoTitle: 'University Retention presentation',
    description:
      'This presentation explores the key factors contributing to student retention at a particular university. This is a simulated business case adapted from a real client project.',
    assignment:
      'Create a visualization that shows the factors that contribute to student retention. Analyze the insights that you can draw from your visualization.',
  },
  {
    path: ROUTE_PATHS.flightSafety,
    pageTitle: 'Flight Safety Trends',
    heading: 'Flight Safety Trends',
    videoUrl: 'https://drive.google.com/file/d/1luG90kQDsM6o5xyfbXyo2DGnbinJG9uz/preview',
    videoTitle: 'Flight Safety presentation',
    description:
      'This was an open-ended assignment with no limits or restrictions. The dataset was very small, fitting entirely within a single screenshot, so there was not a lot to work with. However, I still crafted a comprehensive presentation and provided quality insights with data to back them up. The presentation above is a modified adaptation of that assignment, modified to protect client privacy.',
    assignment: 'Derive insights from our internal audit data.',
  },
];
