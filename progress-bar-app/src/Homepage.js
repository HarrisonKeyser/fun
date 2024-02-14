import React from 'react';
import { Link } from 'react-router-dom';

function HomePage() {
  return (
    <div className="App">
      <header className="App-header">
        <h1>Welcome to My Website</h1>
        <nav>
          <ul>
            <li><Link to="/progress-bar">Progress Bar App</Link></li>
            <li><Link to="/stats">Statistics Explanation</Link></li>
          </ul>
        </nav>
      </header>
    </div>
  );
}

export default HomePage;
