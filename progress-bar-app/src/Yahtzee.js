import React from 'react';
import { Link } from 'react-router-dom';
import './blog-post.css'; // Or reuse blog-post.css if you'd prefer

function Yahtzee() {
  const backArrowUrl = 'https://harrisonkeyserfun.s3.us-east-2.amazonaws.com/arrow-go-back.svg';

  return (
    <div className="App">
      <header className="App-header">
        {/* Image link for the back arrow */}
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
            src="https://drive.google.com/file/d/1l0rXg4Wb9oyWO-tTKk52edQK_YG_TKwo/preview"
            width="1280"
            height="720"
            allow="autoplay"
            title="Yahtzee Video"
          ></iframe>
        </div>

        <h1>How Many Games of <i>Yahtzee!</i> Are There?</h1>

        {/* Transcript */}
        <div className="transcript">
          <h2></h2>
          <p>
            {/* Replace with full transcript content later */}
          </p>
        </div>
      </header>
    </div>
  );
}

export default Yahtzee;
