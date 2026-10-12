import React from 'react';
import { Link } from 'react-router-dom';
import Header from '../components/Header';

const ErrorPage = () => {
  return (
    <div className="page-wrapper">
      <Header title="Not Found" showBack={true} backUrl="/home" />

      <div className="page-content space-top text-center">
        <div className="container">
          <div className="error-page my-4">
            <div className="icon-bx mb-3">
              <img src="/assets/images/error2.svg" alt="error icon" style={{ maxHeight: '80px' }} />
            </div>
            <div className="clearfix">
              <h2 className="title text-primary">Sorry</h2>
              <p className="text-muted">Requested content not found.</p>
            </div>
          </div>
          <div className="error-img my-4">
            <img src="/assets/images/error.png" alt="404" className="img-fluid" style={{ maxHeight: '220px' }} />
          </div>

          <Link to="/home" className="btn btn-lg btn-gradient w-100 dz-flex-box rounded-xl mt-3">
            Back to Home
          </Link>
        </div>
      </div>
    </div>
  );
};

export default ErrorPage;
