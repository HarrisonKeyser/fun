import React from 'react';
import { Link } from 'react-router-dom';
import './blog-post.css'; // Reuse existing blog-post styling

function UniversityRetention() {
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
            src="https://drive.google.com/file/d/1ljbeo1Ny-XSQVAVpxDPlpB0IG2ZweP3b/preview"
            width="1280"
            height="720"
            allow="autoplay"
            title="University Retention Presentation"
          ></iframe>
        </div>
        <div className="transcript">
          <p>
            This presentation explores the key factors contributing to student retention at a particular university. This is a simulated business case adapted from a real client project.
          </p>
            <h3>Assignment from Client:</h3>
            <blockquote>
                <strong>Task:</strong> Create a visualization that shows the factors that contribute to student retention. Analyze the insights that you can draw from your visualization.
            </blockquote>
        </div>
      </header>
    </div>
  );
}

export default UniversityRetention;