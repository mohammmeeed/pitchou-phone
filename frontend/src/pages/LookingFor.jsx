import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useDating } from '../context/DatingContext';

const LookingFor = () => {
  const navigate = useNavigate();
  const { userProfile, setUserProfile } = useDating();
  const [looking, setLooking] = useState(userProfile?.lookingFor || 'Long-term partner');

  const options = [
    'Long-term partner',
    'Long-term, open to short',
    'Short-term, open to long',
    'Short-term fun',
    'New friends',
    'Stil figuring it out'
  ];

  const handleNext = () => {
    setUserProfile(prev => ({ ...prev, lookingFor: looking }));
    navigate('/recent-pics');
  };

  return (
    <div className="bg-white" style={{ minHeight: '100vh' }}>
      <div className="page-wrapper">
        <div className="page-content">
          <div className="container">
            <div className="account-area">
              <Link to="/intrested" className="back-btn dz-flex-box">
                <i className="icon feather icon-chevron-left"></i>
              </Link>
              <div className="section-head ps-0">
                <h3>What are you looking for right now ?</h3>
              </div>
              <div className="radio style-2">
                {options.map((opt) => (
                  <label key={opt} className="radio-label">
                    <input 
                      type="radio" 
                      name="radioLooking" 
                      checked={looking === opt}
                      onChange={() => setLooking(opt)}
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

export default LookingFor;
