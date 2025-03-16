import React from 'react';
import { Link } from 'react-router-dom';
import './HomePage.css';

function HomePage() {
  return (
    <div className="App">
      <header className="App-header">
        {/* FUN SECTION */}
        <section className="homepage-section">
          <h2 className="section-title">Fun</h2>
          <div className="nav-container">
            <div className="nav-item">
              <Link to="/progress-bar">
                <img src="https://harrisonkeyserfun.s3.us-east-2.amazonaws.com/ClickThumbnail.png" alt="Click!" />
              </Link>
            </div>
            <div className="nav-item">
              <Link to="/fish">
                <div className="nav-placeholder">Fish Random</div>
              </Link>
            </div>
            <div className="nav-item">
              <Link to="/senet">
                <img src="https://harrisonkeyserfun.s3.us-east-2.amazonaws.com/SenetWebsiteThumbnail.png" alt="Egyptian Senet" />
              </Link>
            </div>
          </div>
        </section>

        {/* LEARN SECTION */}
        <section className="homepage-section">
          <h2 className="section-title">Learn</h2>
          <div className="nav-container">
            <div className="nav-item">
              {/* <Link to="/baseball">
                <img src="https://harrisonkeyserfun.s3.us-east-2.amazonaws.com/BaseballThumbnailv1.png" alt="Predicting Baseball Home Runs" />
              </Link> */}
              <img
                src="https://harrisonkeyserfun.s3.us-east-2.amazonaws.com/BaseballThumbnailConstruction.png"
                alt="Baseball Page Under Construction"
              />
            </div>
            <div className="nav-item">
              <Link to="/yahtzee">
              <img src="https://harrisonkeyserfun.s3.us-east-2.amazonaws.com/YahtzeeThumbnailwebsiteversion.png" alt="Yahtzee" />
              </Link>
            </div>
          </div>
        </section>

        {/* DEMOS SECTION */}
        <section className="homepage-section">
          <h2 className="section-title">Data Analysis Demos (for Recruiters)</h2>
          <p className="recruiter-blurb">
            This section provides some examples of the type of work you can expect me to do. These are real business case studies and real presentations which I have given to real businesses. Data and context have been altered to protect privacy. The type of analysis I am able to do is not limited to the presentations shown here. Enjoy 😁.
          </p>
          <div className="nav-container">
            <div className="nav-item">
              <Link to="/university-retention">
                <div className="nav-placeholder">University Retention</div>
              </Link>
            </div>
            <div className="nav-item">
              <Link to="/flight-safety">
                <div className="nav-placeholder">Flight Safety Trends</div>
              </Link>
            </div>
          </div>
        </section>
      </header>

      <footer className="site-footer">
        © 2025. A website by Harrison Keyser
      </footer>
    </div>
  );
}

export default HomePage;
