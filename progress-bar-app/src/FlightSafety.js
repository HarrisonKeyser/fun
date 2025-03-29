import React from 'react';
import { Link } from 'react-router-dom';
import './blog-post.css'; // Reuse styling from other pages

function FlightSafety() {
  const backArrowUrl = 'https://harrisonkeyserfun.s3.us-east-2.amazonaws.com/arrow-go-back.svg';

  return (
    <div className="App">
      <header className="App-header">
        {/* Back button */}
        <Link to="/" style={{ position: 'absolute', top: '20px', left: '20px' }}>
          <img
            src={backArrowUrl}
            alt="Go back to homepage"
            style={{ width: '30px', height: '30px', cursor: 'pointer' }}
          />
        </Link>

        {/* Embedded Google Drive video */}
        <div className="video-container">
          <iframe
            src="https://drive.google.com/file/d/1luG90kQDsM6o5xyfbXyo2DGnbinJG9uz/preview"
            width="1280"
            height="720"
            allow="autoplay"
            title="Flight Safety Video"
          ></iframe>
        </div>
        <div className="transcript">
            <p>
            This was an open-ended assignment with no limits or restrictions. The dataset was very small, fitting entirely within a single screenshot, so there was not a lot to work with. However, I still crafted a comprehensive presentation and provided quality insights with data to back them up. The presentation above is a modified adaptation of that assignment, modified to protect client privacy.
            </p>
          <h2>Assignment from Client:</h2>
          <blockquote>
            <strong>Task:</strong> Derive insights from our internal audit data.
          </blockquote>
        </div>
      </header>
    </div>
  );
}

export default FlightSafety;
