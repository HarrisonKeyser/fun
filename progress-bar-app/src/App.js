import React from 'react';
import { HashRouter as Router, Routes, Route, Link } from 'react-router-dom';
import FadeTransitionWrapper from './FadeTransitionWrapper';
import './App.css';
import ProgressBarPage from './ProgressBarPage';
import Baseball from './Baseball';
import HomePage from './HomePage';
import Yahtzee from './Yahtzee';
import Senet from './Senet';
import UniversityRetention from './UniversityRetention';
import FlightSafety from './FlightSafety';

function App() {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<FadeTransitionWrapper><HomePage /></FadeTransitionWrapper>} />
        <Route path="/progress-bar" element={<FadeTransitionWrapper><ProgressBarPage /></FadeTransitionWrapper>} />
        <Route path="/baseball" element={<FadeTransitionWrapper><Baseball /></FadeTransitionWrapper>} />
        <Route path="/yahtzee" element={<FadeTransitionWrapper><Yahtzee /></FadeTransitionWrapper>} />
        <Route path="/senet" element={<FadeTransitionWrapper><Senet /></FadeTransitionWrapper>} />
        <Route path="/university-retention" element={<FadeTransitionWrapper><UniversityRetention /></FadeTransitionWrapper>} />
        <Route path="/flight-safety" element={<FadeTransitionWrapper><FlightSafety /></FadeTransitionWrapper>} />
      </Routes>
    </Router>
  );
}

export default App;
