import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useDating } from '../context/DatingContext';

const FirstName = () => {
  const navigate = useNavigate();
  const { userProfile, setUserProfile } = useDating();
  const [firstName, setFirstName] = useState(userProfile?.name?.split(' ')[0] || '');

  const handleSubmit = (e) => {
    e.preventDefault();
    setUserProfile(prev => ({ ...prev, name: firstName }));
    navigate('/enter-birth-date');
  };

  return (
    <div className="bg-white" style={{ minHeight: '100vh' }}>
      <div className="page-wrapper">
        <div className="page-content">
          <div className="container">
            <div className="account-area">
              <Link to="/otp" className="back-btn dz-flex-box">
                <i className="icon feather icon-chevron-left"></i>
              </Link>
              <div className="section-head ps-0">
                <h3>Enter your name?</h3>
              </div>
              <form onSubmit={handleSubmit}>
                <div className="mb-2 input-group input-group-icon input-mini">
                  <div className="input-group-text">
                    <div className="input-icon">
                      <i className="icon feather icon-user"></i>
                    </div>
                  </div>
                  <input 
                    type="text" 
                    className="form-control" 
                    placeholder="Enter first name"
                    value={firstName}
                    onChange={(e) => setFirstName(e.target.value)}
                    required
                  />								
                </div>
              </form>
            </div>
          </div>
        </div>

        <div className="footer fixed bg-white">
          <div className="container">
            <Link 
              to="/enter-birth-date" 
              onClick={() => setUserProfile(prev => ({ ...prev, name: firstName || 'User' }))}
              className="btn btn-lg btn-gradient w-100 dz-flex-box btn-shadow rounded-xl"
            >
              Next
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
};

export default FirstName;
