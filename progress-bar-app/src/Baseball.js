import React from 'react';
import { Link } from 'react-router-dom';

function Baseball() {
  // URL to your SVG image hosted on AWS S3
  const backArrowUrl = 'https://harrisonkeyserfun.s3.us-east-2.amazonaws.com/arrow-go-back.svg';

  return (
    <div className="App">
      <header className="App-header">
        {/* Image link for the back arrow */}
        <Link to="/" style={{ position: 'absolute', top: '20px', left: '20px' }}>
          <img src={backArrowUrl} alt="Go back to homepage" style={{ width: '30px', height: '30px', cursor: 'pointer' }} />
        </Link>
        <h1>Baseball Statistics with Poisson Distribution</h1>
        <p>This page will talk about predicting home runs in a baseball game using a Poisson distribution.</p>
      </header>
    </div>
  );
}

export default Baseball;
