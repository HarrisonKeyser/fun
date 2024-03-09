import React from 'react';
import { Link } from 'react-router-dom';
import './blog-post.css';

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
        <h1>Predicting Home Runs in Baseball</h1>
        {/* Blog post content */}
        <div className="blog-post">
          <h2>I. Introduction</h2>
          <p>
            "Crack!" The sound of a baseball soaring over the outfield fence is one of the most exhilarating moments in America's pastime. Home runs are not only crowd-pleasers but also game-changers, often deciding the outcome of a close match. In the 2022 MLB season, a staggering 6,556 home runs were hit, setting a new record for the most in a single season.
          </p>
          
          <p>
            As a statistician and baseball fan, being able to predict the number of home runs in a game can provide valuable insights for strategy, player evaluation, or even betting purposes. Plus, using statistics to predict things is just fun!
          </p>

          <p>
            Let's explore how we can build a machine learning model to predict the number of home runs that will occur in a baseball game. Keep in mind -- this is not the only responsibility of data analysts! (Although, it is an important part, and one of my favorite practical applications of data science).
          </p>

          <p>
            We will explore how we can improve our model by using a <strong>Poisson distribution</strong>, the most well-suited model type for predicting baseball home runs. We'll dive into the theory behind Poisson distributions, compare them to the more familiar <strong>normal distribution</strong>, and walk through the process of building a predictive model for home runs using Python and popular data science libraries. Additionally, we'll address important concepts like <strong>overfitting</strong>, <strong>feature selection</strong>, and <strong>model validation</strong> to ensure our predictions are reliable and robust.
          </p>

          <h2>II. </h2>
        </div>
      </header>
    </div>
  );
}

export default Baseball;
