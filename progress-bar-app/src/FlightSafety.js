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
