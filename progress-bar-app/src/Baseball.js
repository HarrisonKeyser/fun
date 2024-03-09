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
            "Crack!" The sound of a baseball soaring over the outfield fence is one of the most exhilarating moments in America's pastime. Home runs are not only crowd-pleasers but also game-changers, often deciding the outcome of a close match. In the 2023 MLB season, a staggering 5,868 home runs were hit -- the fifth most in a single season in MLB history.
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

          <h2>II. Understanding Poisson Distributions</h2>
          <p>
            The Poisson distribution is a discrete probability distribution that models the likelihood of a given number of events occurring within a fixed interval of time or space, given a known average rate of occurrence. It is particularly useful for modeling rare, countable events, such as the number of home runs in a baseball game, which can be considered independent and randomly distributed over time.
          </p>

          <p>
            Unlike the normal distribution, which is continuous and symmetric, the Poisson distribution is inherently discrete and can effectively handle situations where the number of occurrences is low and non-negative, making it more suitable for count data or events that do not conform to the bell curve pattern of the normal distribution.
          </p>
          {/* Insert Poisson distribution graph here */}

          <p>
            The Poisson distribution is characterized by a single parameter, λ (lambda), which represents the average number of events in the given interval -- in our case, the average number of home runs in one baseball game. The probability mass function (PMF) of the Poisson distribution is given by:
          </p>

          <div className="formula-container">
            <div className="formula">
              P(X = k) = (e<sup>-λ</sup> * λ<sup>k</sup>) / k!
            </div>
          </div>

          <p>Where:</p>

          <ul>
            <li>X is the random variable representing the number of events</li>
            <li>k is the specific number of events we're interested in</li>
            <li>e is the base of the natural logarithm (approximately 2.71828)</li>
          </ul>

          <p>
            What does this math all mean? Well, once we set up our Poisson distribution, we are able to predict the likelihood of a certain number of events occuring within a certain interval.
          </p>

          <p>
            Let's say you are working the front desk of a hotel, and the front desk receives -- on average -- one call every 15 minutes. Of course, we know that you won't receive a call exactly every quarter hour. You may receive two calls within two minutes, or you may not receive any calls for an entire hour! What are the likelihoods of these events? We can intuitively tell that both of these events are unlikely. However, we can use a Poisson model to find the exact probability of them.
          </p>

          <p>
            Let's set up our Poisson equation to find the likelihood of you receiving zero calls in one hour.
          </p>

          <div className="formula-container">
            <div className="formula">
              P(X = 0) = (e<sup>-4</sup> * 4<sup>0</sup>) / 0!
            </div>
          </div>

          <p>
            In the above equation:
          </p>
          <ul>
            <li>P(X = 0) is the probability you will receive 0 phone calls in one hour.</li>
            <li>k is the specific number of events we're interested in. Since we are searching for the probability of 0 phone calls, k = 0.</li>
            <li>λ is set equal to 4, since you expect to receive 4 phone calls every hour (one every 15 minutes).</li>
          </ul>

          {/* insert table with different P(X = k) values and p-values*/}
          <p>
            P(X = 0) evaluates to 0.018316. That means if you worked the front desk for 1000 hours, you will receive 0 phone calls in approximately 18 of those hours. Alternatively, for every hour you work, there is a 1.832% chance that you will receive no phone calls, assuming our model is accurate.
          </p>

          <p>
            (The probability you receive two phone calls within 2 minutes is 1.658%.)
          </p>

          <p>
            Compared to the normal distribution, which is a continuous probability distribution often used to model measurements or observations that cluster around a central value, the Poisson distribution is more appropriate for modeling count data or rare events. While the normal distribution assumes that the data is symmetrically distributed around the mean, the Poisson distribution is skewed to the right, reflecting the fact that rare events are more likely to occur at lower counts.
          </p>
          {/* insert image of Normal distribution vs Poisson distribution */}

          <p>
            In a baseball game, the number of home runs is typically low, with most games having zero or a few home runs. The normal distribution would not be a good fit for modeling such data, as it allows for negative values and non-discrete values (which are impossible for counts) and assumes a symmetric distribution around the mean, which is not the case for rare events like home runs.
          </p>

          <p>
            The Poisson distribution, on the other hand, is specifically designed to model discrete, positive data with rare occurrences, making it an ideal choice for predicting home runs in baseball games.
          </p>

          <p>
            Let's move on to building our predictive model and see how we can leverage the power of the Poisson distribution to forecast home run counts accurately.
          </p>

          <h2>III. Building a Predictive Model</h2>
        </div>
      </header>
    </div>
  );
}

export default Baseball;
