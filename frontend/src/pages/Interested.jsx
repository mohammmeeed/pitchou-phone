import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useDating } from '../context/DatingContext';

const Interested = () => {
  const navigate = useNavigate();
  const { userProfile, setUserProfile } = useDating() || {};
  const [interested, setInterested] = useState(userProfile?.interestedIn || 'Women');

  const options = ['Women', 'Men', 'Other'];

  const handleNext = () => {
    setUserProfile(prev => ({ ...prev, interestedIn: interested }));
    navigate('/looking-for');
  };

  return (
    <div className="bg-white" style={{ minHeight: '100vh' }}>
      <div className="page-wrapper">
        <div className="page-content">
          <div className="container">
            <div className="account-area">
              <Link to="/orientation" className="back-btn dz-flex-box">
                <i className="icon feather icon-chevron-left"></i>
              </Link>
              <div className="section-head ps-0">
                <h3>Who are you interested in seeing ?</h3>
              </div>
              <div className="radio style-2">
                {options.map((opt) => (
                  <label key={opt} className="radio-label">
                    <input 
                      type="radio" 
                      name="radioInterest" 
                      checked={interested === opt}
                      onChange={() => setInterested(opt)}
                    />
                    <span className="checkmark">						
                      <span className="text">{opt}</span>
                      <span className="check"></span>							
                    </span>
                  </label>
                ))}
              </div>
            </div>
          </div>
        </div>

        <div className="footer fixed bg-white">
          <div className="container">
            <button 
              type="button" 
              onClick={handleNext} 
              className="btn btn-lg btn-gradient w-100 dz-flex-box btn-shadow rounded-xl"
            >
              Next
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Interested;
