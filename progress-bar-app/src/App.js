import React from 'react';
import { HashRouter as Router, Routes, Route, Link } from 'react-router-dom';
import FadeTransitionWrapper from './FadeTransitionWrapper';
import './App.css';
import ProgressBarPage from './ProgressBarPage';
import Baseball from './Baseball';
import HomePage from './HomePage'

function App() {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<FadeTransitionWrapper><HomePage /></FadeTransitionWrapper>} />
        <Route path="/progress-bar" element={<FadeTransitionWrapper><ProgressBarPage /></FadeTransitionWrapper>} />
        <Route path="/baseball" element={<FadeTransitionWrapper><Baseball /></FadeTransitionWrapper>} />
      </Routes>
    </Router>
  );
}

export default App;
