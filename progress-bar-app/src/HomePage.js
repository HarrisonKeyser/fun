import React from 'react';
import { Link } from 'react-router-dom';
import './HomePage.css'; // Assuming you will put your styles in HomePage.css

function HomePage() {
  return (
    <div className="App">
      <header className="App-header">
        <nav className="nav-container">
          <div className="nav-item">
            <Link to="/progress-bar">
              <img src="https://harrisonkeyserfun.s3.us-east-2.amazonaws.com/ClickThumbnail.png" alt="Click!" />
            </Link>
          </div>
          <div className="nav-item">
            <Link to="/baseball">
              <img src="https://harrisonkeyserfun.s3.us-east-2.amazonaws.com/BaseballThumbnailv1.png" alt="Predicting Baseball Home Runs" />
            </Link>
          </div>
        </nav>
      </header>
    </div>
  );
}

export default HomePage;
