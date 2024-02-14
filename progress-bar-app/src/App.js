import React from 'react';
import { BrowserRouter as Router, Routes, Route, Link } from 'react-router-dom';
import './App.css';
import ProgressBarPage from './ProgressBarPage';
import Baseball from './Baseball';
import Homepage from './Homepage'

function App() {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<Homepage />} />
        <Route path="/progress-bar" element={<ProgressBarPage />} />
        <Route path="/stats" element={<Baseball />} />
      </Routes>
    </Router>
  );
}

export default App;
