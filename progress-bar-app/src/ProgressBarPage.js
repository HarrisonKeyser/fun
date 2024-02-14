import React from 'react';
import ProgressBar from './ProgressBar'; // Assuming ProgressBar is a separate component
import { Link } from 'react-router-dom';

function ProgressBarPage() {
  const backArrowUrl = 'https://harrisonkeyserfun.s3.us-east-2.amazonaws.com/arrow-go-back.svg';

  return (
    <div className="App">
      <header className="App-header">
        {/* Image link for the back arrow */}
        <Link to="/">
          <img src={backArrowUrl} alt="Go back to homepage" style={{ position: 'absolute', top: '20px', left: '20px', width: '30px', height: '30px', cursor: 'pointer' }} />
        </Link>
        <p>Click!!!!</p>
        <ProgressBar /> {/* Use ProgressBar component */}
      </header>
    </div>
  );
}

export default ProgressBarPage;
