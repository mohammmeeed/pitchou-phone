import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';

const orientations = [
  'Straight',
  'Gay',
  'Lesbian',
  'Bisexual',
  'Asexual',
  'Queer',
  'Demisexual'
];

const Orientation = () => {
  const navigate = useNavigate();
  const [selected, setSelected] = useState(['Straight']);

  const toggleOrientation = (item) => {
    setSelected(prev => 
      prev.includes(item) ? prev.filter(x => x !== item) : [...prev, item]
    );
  };

  return (
    <div className="bg-white" style={{ minHeight: '100vh' }}>
      <div className="page-wrapper">
        <div className="page-content">
          <div className="container">
            <div className="account-area">
              <Link to="/your-gender" className="back-btn dz-flex-box">
                <i className="icon feather icon-chevron-left"></i>
              </Link>
              <div className="section-head ps-0">
                <h3>Your sexual orientation ?</h3>
              </div>
              <div>
                {orientations.map((item, idx) => (
                  <div key={item} className="form-check mb-3">
                    <input 
                      className="form-check-input" 
                      type="checkbox" 
                      id={`check-${idx}`}
                      checked={selected.includes(item)}
                      onChange={() => toggleOrientation(item)}
                    />
                    <label className="form-check-label" htmlFor={`check-${idx}`}>
                      {item}
                    </label>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>

        <div className="footer fixed bg-white">
          <div className="container">
            <Link to="/intrested" className="btn btn-lg btn-gradient w-100 dz-flex-box btn-shadow rounded-xl">
              Next
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Orientation;
