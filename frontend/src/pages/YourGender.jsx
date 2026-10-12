import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useDating } from '../context/DatingContext';

const YourGender = () => {
  const navigate = useNavigate();
  const { userProfile, setUserProfile } = useDating();
  const [selectedGender, setSelectedGender] = useState(userProfile?.gender || 'Women');

  const genders = ['Women', 'Men', 'Other'];

  const handleNext = () => {
    setUserProfile(prev => ({ ...prev, gender: selectedGender }));
    navigate('/orientation');
  };

  return (
    <div className="bg-white" style={{ minHeight: '100vh' }}>
      <div className="page-wrapper">
        <div className="page-content">
          <div className="container">
            <div className="account-area">
              <Link to="/enter-birth-date" className="back-btn dz-flex-box">
                <i className="icon feather icon-chevron-left"></i>
              </Link>
              <div className="section-head ps-0">
                <h3>What's your gender ?</h3>
              </div>
              <div className="radio style-2">
                {genders.map((g) => (
                  <label key={g} className="radio-label">
                    <input 
                      type="radio" 
                      name="radio2" 
                      checked={selectedGender === g}
                      onChange={() => setSelectedGender(g)}
                    />
                    <span className="checkmark">						
                      <span className="text">{g}</span>
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
              className="btn btn-gradient w-100 dz-flex-box btn-shadow rounded-xl"
            >
              Next
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default YourGender;
