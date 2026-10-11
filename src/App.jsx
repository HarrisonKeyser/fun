import { Route, Routes } from 'react-router';
import ScrollToTop from './components/ScrollToTop.jsx';
import { ROUTE_PATHS } from './routePaths.js';
import { CASE_STUDIES } from './content/caseStudies.jsx';

import HomePage from './pages/HomePage/HomePage.jsx';
import ClickPage from './pages/ClickPage/ClickPage.jsx';
import SenetPage from './pages/SenetPage/SenetPage.jsx';
import BankBonusesPage from './pages/BankBonusesPage/BankBonusesPage.jsx';
import CaseStudyPage from './pages/CaseStudyPage/CaseStudyPage.jsx';
import NotFoundPage from './pages/NotFoundPage/NotFoundPage.jsx';

export default function App() {
  return (
    <>
      <ScrollToTop />
      <Routes>
        <Route path={ROUTE_PATHS.home} element={<HomePage />} />
        <Route path={ROUTE_PATHS.click} element={<ClickPage />} />
        <Route path={ROUTE_PATHS.senet} element={<SenetPage />} />
        <Route path={ROUTE_PATHS.bankBonuses} element={<BankBonusesPage />} />

        {CASE_STUDIES.map((caseStudy) => (
          <Route
            key={caseStudy.path}
            path={caseStudy.path}
            element={<CaseStudyPage caseStudy={caseStudy} />}
          />
        ))}

        <Route path="*" element={<NotFoundPage />} />
      </Routes>
    </>
  );
}
