import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';

const EnterBirthDate = () => {
  const navigate = useNavigate();
  const [birthDate, setBirthDate] = useState('2000-01-01');

  const handleSubmit = (e) => {
    e.preventDefault();
    navigate('/your-gender');
  };

  return (
    <div className="bg-white" style={{ minHeight: '100vh' }}>
      <div className="page-wrapper">
        <div className="page-content">
          <div className="container">
            <div className="account-area">
              <Link to="/first-name" className="back-btn dz-flex-box">
                <i className="icon feather icon-chevron-left"></i>
              </Link>
              <div className="section-head ps-0">
                <h3>Enter your Birth Date?</h3>
              </div>
              <form onSubmit={handleSubmit}>
                <div className="mb-2 input-group input-group-icon input-mini">
                  <div className="input-group-text">
                    <div className="input-icon">
                      <i className="icon feather icon-calendar"></i>
                    </div>
                  </div>
                  <input 
                    type="date" 
                    className="form-control" 
                    value={birthDate}
                    onChange={(e) => setBirthDate(e.target.value)}
                  />								
                </div>
              </form>
            </div>
          </div>
        </div>

        <div className="footer fixed bg-white">
          <div className="container">
            <Link to="/your-gender" className="btn btn-lg btn-gradient w-100 dz-flex-box btn-shadow rounded-xl">
              Next
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
};

export default EnterBirthDate;
