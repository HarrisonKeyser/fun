import React from 'react';
import './App.css';
import ProgressBar from './ProgressBar'; // Import your progress bar component

function App() {
  return (
    <div className="App">
      <header className="App-header">
        <p>Click!!!!</p>
        <ProgressBar /> {/* Use your ProgressBar component */}
      </header>
    </div>
  );
}

export default App;
